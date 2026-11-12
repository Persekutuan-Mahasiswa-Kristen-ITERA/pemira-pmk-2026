#!/usr/bin/env node
/**
 * `pnpm db:reset:uji-coba <local|staging|production>`: akhiri uji coba publik.
 *
 *   1. Tampilkan kondisi database dan minta konfirmasi (ketik nama database).
 *   2. (remote) Catat bookmark Time Travel D1, untuk memulihkan bila ada yang salah.
 *   3. Arsipkan audit log ke data/reset-uji-coba/ (folder data/ tidak masuk repo).
 *   4. Jalankan scripts/reset-uji-coba.sql (menolak bila mode uji coba publik tidak menyala).
 *   5. Verifikasi: data pemilihan kosong, flag mati, jumlah trigger sama seperti sebelum reset.
 *
 * Latih dulu di staging: `pnpm wrangler d1 execute pemira-db-staging --env preview --remote
 * --file scripts/uji-coba-publik-on.sql`, isi data uji, lalu `pnpm db:reset:uji-coba staging`.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const TARGETS = {
	local: { db: 'pemira-db', flags: ['--local'], remote: false },
	staging: { db: 'pemira-db-staging', flags: ['--env', 'preview', '--remote'], remote: true },
	production: { db: 'pemira-db', flags: ['--remote'], remote: true }
};

const ELECTION_TABLES = ['ballots', 'voted', 'vote_passes', 'booth_codes', 'exception_codes'];
const KEPT_TABLES = ['candidates', 'candidate_photos', 'voters', 'admins', 'officers'];

const name = process.argv[2];
const target = TARGETS[name];
if (!target) {
	console.error('Pakai: pnpm db:reset:uji-coba <local|staging|production>');
	process.exit(1);
}

const wrangler = new URL('../node_modules/.bin/wrangler', import.meta.url).pathname;

function run(args, { json = false } = {}) {
	const result = spawnSync(wrangler, args, {
		encoding: 'utf8',
		stdio: ['inherit', 'pipe', 'inherit']
	});
	if (result.status !== 0) {
		console.error(result.stdout);
		throw new Error(`wrangler ${args.slice(0, 3).join(' ')} gagal (kode ${result.status})`);
	}
	return json ? JSON.parse(result.stdout) : result.stdout;
}

/** Satu query SELECT, mengembalikan baris hasil. */
function query(sql) {
	const out = run(['d1', 'execute', target.db, ...target.flags, '--json', '--command', sql], {
		json: true
	});
	return out[0].results;
}

function snapshot() {
	const counts = [...ELECTION_TABLES, ...KEPT_TABLES, 'audit_log']
		.map((t) => `(SELECT count(*) FROM ${t}) AS ${t}`)
		.join(', ');
	const [row] = query(
		`SELECT ${counts}, (SELECT count(*) FROM sqlite_master WHERE type = 'trigger') AS triggers, ` +
			'opens_at, closes_at, audit_public, public_test FROM election_config WHERE id = 1'
	);
	return row;
}

function print(title, row) {
	console.log(`\n${title}`);
	for (const [key, value] of Object.entries(row)) console.log(`  ${key.padEnd(18)} ${value}`);
}

const before = snapshot();
print(`Kondisi ${target.db} (${name}) sekarang:`, before);

if (before.public_test !== 1) {
	console.error(
		'\nMode uji coba publik TIDAK menyala di database ini, jadi reset ditolak. ' +
			'Bila ini production pada hari-H, berarti reset sudah pernah dijalankan.'
	);
	process.exit(1);
}

console.log(
	'\nAkan DIHAPUS : surat suara, tanda sudah memilih, izin memilih, kode TPS, kode pengecualian,' +
		'\n               audit log (diarsipkan dulu); jadwal dikosongkan; pita uji coba dimatikan.' +
		'\nDIPERTAHANKAN: calon, foto, visi-misi, DPT, admin, Petugas TPS, judul pemilihan.'
);
const rl = createInterface({ input: stdin, output: stdout });
const typed = (
	await rl.question(`\nKetik nama database (${target.db}) untuk melanjutkan: `)
).trim();
rl.close();
if (typed !== target.db) {
	console.error('Dibatalkan.');
	process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = new URL(`../data/reset-uji-coba/${name}-${stamp}/`, import.meta.url).pathname;
mkdirSync(dir, { recursive: true });

let bookmark = null;
if (target.remote) {
	const envFlags = target.flags.filter((f) => f !== '--remote');
	const info = run(['d1', 'time-travel', 'info', target.db, ...envFlags, '--json'], { json: true });
	bookmark = info.bookmark ?? null;
	if (!bookmark) throw new Error(`Bookmark Time Travel tidak ditemukan: ${JSON.stringify(info)}`);
	writeFileSync(`${dir}bookmark.txt`, `${bookmark}\n`);
	console.log(`\nBookmark Time Travel: ${bookmark}`);
}

const audit = query('SELECT * FROM audit_log ORDER BY id');
writeFileSync(`${dir}audit-log.json`, JSON.stringify(audit, null, '\t') + '\n');
writeFileSync(`${dir}sebelum.json`, JSON.stringify(before, null, '\t') + '\n');
console.log(`Audit log (${audit.length} entri) diarsipkan di ${dir}`);

console.log('\nMenjalankan reset...');
run(['d1', 'execute', target.db, ...target.flags, '--yes', '--file', 'scripts/reset-uji-coba.sql']);

const after = snapshot();
print('Kondisi setelah reset:', after);
writeFileSync(`${dir}sesudah.json`, JSON.stringify(after, null, '\t') + '\n');

const problems = [
	...ELECTION_TABLES.filter((t) => after[t] !== 0).map(
		(t) => `${t} masih berisi ${after[t]} baris`
	),
	...KEPT_TABLES.filter((t) => after[t] !== before[t]).map(
		(t) => `${t} berubah: ${before[t]} → ${after[t]}`
	),
	...(after.audit_log === 1 ? [] : [`audit_log berisi ${after.audit_log} entri (harus 1)`]),
	...(after.triggers === before.triggers
		? []
		: [`jumlah trigger berubah: ${before.triggers} → ${after.triggers}`]),
	...(after.opens_at === null && after.closes_at === null ? [] : ['jadwal belum kosong']),
	...(after.audit_public === 0 ? [] : ['audit publik masih terbuka']),
	...(after.public_test === 0 ? [] : ['pita uji coba masih menyala'])
];

if (problems.length) {
	console.error('\n✗ VERIFIKASI GAGAL:');
	for (const p of problems) console.error(`  - ${p}`);
	if (bookmark) {
		const envFlags = target.flags.filter((f) => f !== '--remote').join(' ');
		console.error(
			`\nPulihkan ke kondisi sebelum reset:\n  pnpm wrangler d1 time-travel restore ${target.db} ${envFlags} --bookmark=${bookmark}`
		);
	}
	process.exit(1);
}

console.log('\n✓ Reset uji coba publik selesai dan terverifikasi. Pita uji coba sudah hilang.');
console.log(
	'  Berikutnya: atur jadwal resmi di /admin, cek calon dan DPT, umumkan sidik jari DPT.'
);
