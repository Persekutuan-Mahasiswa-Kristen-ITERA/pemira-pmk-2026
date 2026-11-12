import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { asD1, freshDb } from './testing/sqlite';
import {
	approveException,
	boothCodeStatement,
	boothCodeStats,
	cancelException,
	generateCode,
	getPass,
	issueExceptionDirect,
	listExceptions,
	normalizeCode,
	redeemBoothCode,
	redeemExceptionCode,
	requestException,
	usedExceptionNims
} from './tps';
import { castVote } from './vote';

const ALICE = '122140001';
const BOB = '122140002';
const OUTSIDER = '122140099';
const OFFICER = 'petugas@gmail.com';
const ADMIN_A = 'a@itera.ac.id';
const ADMIN_B = 'b@itera.ac.id';
const SUPER = 'super@itera.ac.id';

let raw: DatabaseSync;
let db: D1Database;

const count = (sql: string) => (raw.prepare(sql).get() as { n: number }).n;

function open() {
	raw.exec(
		'UPDATE election_config SET opens_at = unixepoch() - 60, closes_at = unixepoch() + 3600'
	);
}

async function newBoothCode(): Promise<string> {
	const code = generateCode(6);
	await (await boothCodeStatement(db, OFFICER, code)).run();
	return code;
}

beforeEach(() => {
	raw = freshDb();
	db = asD1(raw);
	raw.exec(`INSERT INTO candidates (id, number, name) VALUES (1, 1, 'Satu'), (2, 2, 'Dua')`);
	raw
		.prepare('INSERT INTO voters (nim, name) VALUES (?, ?), (?, ?)')
		.run(ALICE, 'Alice', BOB, 'Bob');
});

describe('kode', () => {
	it('dibuat acak dengan tanda hubung di tengah', () => {
		expect(generateCode(6)).toMatch(/^[0-9A-Z]{3}-[0-9A-Z]{3}$/);
		expect(generateCode(8)).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
		expect(generateCode(6)).not.toMatch(/[ILOU]/);
	});

	it('memaafkan huruf kecil, spasi, dan huruf yang mirip angka', () => {
		expect(normalizeCode(' k7q-4mp ')).toBe('K7Q4MP');
		expect(normalizeCode('o1l-IO0')).toBe('011100');
	});
});

describe('suara wajib lewat izin memilih', () => {
	it('menolak suara tanpa izin', async () => {
		open();
		expect(await castVote(db, ALICE, 1)).toEqual({ ok: false, reason: 'no_pass' });
		expect(count('SELECT count(*) AS n FROM voted')).toBe(0);
		expect(count('SELECT count(*) AS n FROM ballots')).toBe(0);
	});

	it('menolak suara dengan izin yang sudah kedaluwarsa', async () => {
		open();
		raw
			.prepare(
				`INSERT INTO vote_passes (nim, session_hash, via, expires_at)
				 VALUES (?, lower(hex(randomblob(32))), 'tps', unixepoch() - 1)`
			)
			.run(ALICE);
		expect(await castVote(db, ALICE, 1)).toEqual({ ok: false, reason: 'no_pass' });
	});
});

describe('kode TPS', () => {
	it('membuka satu suara lalu izinnya habis', async () => {
		open();
		const code = await newBoothCode();
		const redeemed = await redeemBoothCode(db, ALICE, code.toLowerCase());
		expect(redeemed).toMatchObject({ ok: true, nim: ALICE });
		if (!redeemed.ok) return;

		expect(await getPass(db, redeemed.token)).toMatchObject({ nim: ALICE, via: 'tps' });
		expect(await getPass(db, 'token-lain')).toBeNull();

		expect(await castVote(db, ALICE, 2)).toMatchObject({ ok: true });
		expect(await getPass(db, redeemed.token)).toBeNull();
		expect(count('SELECT count(*) AS n FROM vote_passes')).toBe(0);
	});

	it('hanya bisa dipakai sekali', async () => {
		open();
		const code = await newBoothCode();
		expect(await redeemBoothCode(db, ALICE, code)).toMatchObject({ ok: true });
		expect(await redeemBoothCode(db, BOB, code)).toEqual({ ok: false, reason: 'invalid_code' });
	});

	it('kedaluwarsa setelah waktunya habis', async () => {
		open();
		raw
			.prepare(
				`INSERT INTO booth_codes (code_hash, created_by, created_at, expires_at)
				 VALUES (?, ?, unixepoch() - 200, unixepoch() - 80)`
			)
			.run('0'.repeat(64), OFFICER);
		expect(await redeemBoothCode(db, ALICE, 'ABC-DEF')).toEqual({
			ok: false,
			reason: 'invalid_code'
		});
		expect(await boothCodeStats(db)).toEqual({ created: 1, used: 0, expired: 1, active: 0 });
	});

	it('tidak terbuang untuk pemilih yang sudah memilih atau di luar DPT', async () => {
		open();
		const first = await newBoothCode();
		const r = await redeemBoothCode(db, ALICE, first);
		expect(r.ok).toBe(true);
		await castVote(db, ALICE, 1);

		const code = await newBoothCode();
		expect(await redeemBoothCode(db, ALICE, code)).toEqual({ ok: false, reason: 'already_voted' });
		expect(await redeemBoothCode(db, OUTSIDER, code)).toEqual({
			ok: false,
			reason: 'not_eligible'
		});
		expect(await redeemBoothCode(db, BOB, code)).toMatchObject({ ok: true });
	});

	it('tidak bisa dibuat saat pemungutan suara tidak dibuka', async () => {
		await expect(newBoothCode()).rejects.toThrow(/voting_closed/);
	});

	it('menghitung kode per petugas untuk rekonsiliasi', async () => {
		open();
		await newBoothCode();
		const used = await newBoothCode();
		await redeemBoothCode(db, ALICE, used);
		expect(await boothCodeStats(db, OFFICER)).toEqual({
			created: 2,
			used: 1,
			expired: 0,
			active: 1
		});
		expect(await boothCodeStats(db, 'orang-lain@gmail.com')).toMatchObject({ created: 0 });
	});

	it('tidak menyimpan kode, hanya hash-nya, dan tidak menyimpan NIM', async () => {
		open();
		const code = await newBoothCode();
		await redeemBoothCode(db, ALICE, code);
		const columns = (raw.prepare('PRAGMA table_info(booth_codes)').all() as { name: string }[]).map(
			(c) => c.name
		);
		expect(columns).not.toContain('nim');
		const row = raw.prepare('SELECT code_hash FROM booth_codes').get() as { code_hash: string };
		expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('kode pengecualian', () => {
	it('perlu dua admin berbeda, lalu membuka satu suara tanpa login Google', async () => {
		open();
		const req = await requestException(db, ALICE, 'Akun dinonaktifkan', ADMIN_A);
		expect(req).toMatchObject({ ok: true, name: 'Alice' });
		if (!req.ok) return;

		expect(await approveException(db, req.id, ADMIN_A)).toEqual({
			ok: false,
			reason: 'same_admin'
		});
		const approved = await approveException(db, req.id, ADMIN_B);
		expect(approved).toMatchObject({ ok: true, nim: ALICE });
		if (!approved.ok) return;
		expect(approved.code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
		expect(await approveException(db, req.id, ADMIN_B)).toEqual({
			ok: false,
			reason: 'not_pending'
		});

		const redeemed = await redeemExceptionCode(db, approved.code);
		expect(redeemed).toMatchObject({ ok: true, nim: ALICE });
		if (!redeemed.ok) return;
		expect(await getPass(db, redeemed.token)).toMatchObject({ nim: ALICE, via: 'exception' });
		expect(await redeemExceptionCode(db, approved.code)).toEqual({
			ok: false,
			reason: 'invalid_code'
		});

		expect(await castVote(db, ALICE, 1)).toMatchObject({ ok: true });
		expect(await usedExceptionNims(db)).toEqual([ALICE]);
		expect((await listExceptions(db))[0]).toMatchObject({ status: 'used', approvedBy: ADMIN_B });
	});

	it('database menolak penyetuju yang sama dengan pengaju', async () => {
		open();
		const req = await requestException(db, ALICE, 'Akun terkunci', ADMIN_A);
		if (!req.ok) throw new Error('pengajuan gagal');
		expect(() =>
			raw
				.prepare(
					`UPDATE exception_codes SET approved_by = ?, approved_at = unixepoch(),
					 code_hash = ?, expires_at = unixepoch() + 300 WHERE id = ?`
				)
				.run(ADMIN_A, '1'.repeat(64), req.id)
		).toThrow(/CHECK/);
	});

	it('kode yang dibatalkan tidak bisa dipakai', async () => {
		open();
		const req = await requestException(db, ALICE, 'Akun terkunci', ADMIN_A);
		if (!req.ok) throw new Error('pengajuan gagal');
		const approved = await approveException(db, req.id, ADMIN_B);
		if (!approved.ok) throw new Error('persetujuan gagal');
		expect(await cancelException(db, req.id)).toBe(ALICE);
		expect(await redeemExceptionCode(db, approved.code)).toEqual({
			ok: false,
			reason: 'invalid_code'
		});
		expect((await listExceptions(db))[0].status).toBe('cancelled');
		expect(await usedExceptionNims(db)).toEqual([]);
	});

	it('menolak NIM di luar DPT atau yang sudah memilih', async () => {
		open();
		expect(await requestException(db, OUTSIDER, 'Akun terkunci', ADMIN_A)).toEqual({
			ok: false,
			reason: 'not_eligible'
		});
		const code = await newBoothCode();
		await redeemBoothCode(db, BOB, code);
		await castVote(db, BOB, 1);
		expect(await requestException(db, BOB, 'Akun terkunci', ADMIN_A)).toEqual({
			ok: false,
			reason: 'already_voted'
		});
	});

	it('tidak bisa diajukan saat pemungutan suara tidak dibuka', async () => {
		await expect(requestException(db, ALICE, 'Akun terkunci', ADMIN_A)).rejects.toThrow(
			/voting_closed/
		);
	});

	it('identitas pengajuan tidak bisa diubah atau dihapus', async () => {
		open();
		const req = await requestException(db, ALICE, 'Akun terkunci', ADMIN_A);
		if (!req.ok) throw new Error('pengajuan gagal');
		expect(() =>
			raw.prepare('UPDATE exception_codes SET nim = ? WHERE id = ?').run(BOB, req.id)
		).toThrow(/exception_codes_immutable/);
		expect(() => raw.exec('DELETE FROM exception_codes')).toThrow(/exception_codes_immutable/);
		expect(() => raw.exec('DELETE FROM booth_codes')).not.toThrow();
		await newBoothCode();
		expect(() => raw.exec('DELETE FROM booth_codes')).toThrow(/booth_codes_immutable/);
	});
});

describe('kode pengecualian langsung dari super admin', () => {
	it('dibuat tanpa admin kedua, lalu membuka satu suara tanpa login Google', async () => {
		open();
		const issued = await issueExceptionDirect(db, ALICE, 'Akun dinonaktifkan', SUPER);
		expect(issued).toMatchObject({ ok: true, name: 'Alice' });
		if (!issued.ok) return;
		expect(issued.code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);

		const [row] = await listExceptions(db);
		expect(row).toMatchObject({
			status: 'active',
			solo: true,
			requestedBy: SUPER,
			approvedBy: SUPER
		});
		// Sudah disetujui: tidak bisa "disetujui" lagi oleh siapa pun.
		expect(await approveException(db, issued.id, ADMIN_B)).toEqual({
			ok: false,
			reason: 'not_pending'
		});

		const redeemed = await redeemExceptionCode(db, issued.code);
		expect(redeemed).toMatchObject({ ok: true, nim: ALICE });
		expect(await redeemExceptionCode(db, issued.code)).toEqual({
			ok: false,
			reason: 'invalid_code'
		});
		expect(await castVote(db, ALICE, 1)).toMatchObject({ ok: true });
		expect(await usedExceptionNims(db)).toEqual([ALICE]);
	});

	it('tidak menyimpan kode, hanya hash-nya', async () => {
		open();
		const issued = await issueExceptionDirect(db, ALICE, 'Akun terkunci', SUPER);
		if (!issued.ok) throw new Error('gagal');
		const stored = raw.prepare('SELECT code_hash FROM exception_codes').get() as {
			code_hash: string;
		};
		expect(stored.code_hash).toMatch(/^[0-9a-f]{64}$/);
		expect(JSON.stringify(raw.prepare('SELECT * FROM exception_codes').all())).not.toContain(
			issued.code.replace('-', '')
		);
	});

	it('menolak NIM di luar DPT, yang sudah memilih, atau saat tidak dibuka', async () => {
		await expect(issueExceptionDirect(db, ALICE, 'Akun terkunci', SUPER)).rejects.toThrow(
			/voting_closed/
		);
		open();
		expect(await issueExceptionDirect(db, OUTSIDER, 'Akun terkunci', SUPER)).toEqual({
			ok: false,
			reason: 'not_eligible'
		});
		const code = await newBoothCode();
		await redeemBoothCode(db, BOB, code);
		await castVote(db, BOB, 1);
		expect(await issueExceptionDirect(db, BOB, 'Akun terkunci', SUPER)).toEqual({
			ok: false,
			reason: 'already_voted'
		});
	});

	it('bisa dibatalkan sebelum dipakai', async () => {
		open();
		const issued = await issueExceptionDirect(db, ALICE, 'Akun terkunci', SUPER);
		if (!issued.ok) throw new Error('gagal');
		expect(await cancelException(db, issued.id)).toBe(ALICE);
		expect(await redeemExceptionCode(db, issued.code)).toEqual({
			ok: false,
			reason: 'invalid_code'
		});
	});

	it('database tetap mewajibkan dua admin untuk baris biasa', async () => {
		open();
		const insert = (solo: number, approvedBy: string | null) => () =>
			raw
				.prepare(
					`INSERT INTO exception_codes
					 (id, nim, reason, requested_by, approved_by, approved_at, code_hash, expires_at, solo)
					 VALUES (?, ?, 'Akun terkunci', ?, ?, CASE WHEN ?4 IS NULL THEN NULL ELSE unixepoch() END,
					         CASE WHEN ?4 IS NULL THEN NULL ELSE ? END,
					         CASE WHEN ?4 IS NULL THEN NULL ELSE unixepoch() + 300 END, ?)`
				)
				.run(crypto.randomUUID(), ALICE, ADMIN_A, approvedBy, '2'.repeat(64), solo);
		// Baris biasa yang disetujui pengajunya sendiri.
		expect(insert(0, ADMIN_A)).toThrow(/CHECK/);
		// Baris solo dengan penyetuju berbeda, atau solo yang masih menunggu.
		expect(insert(1, ADMIN_B)).toThrow(/CHECK/);
		expect(insert(1, null)).toThrow(/CHECK/);
		// Kontrol: bentuk yang sah tetap diterima.
		expect(insert(0, ADMIN_B)).not.toThrow();
		expect(() =>
			raw
				.prepare(
					`INSERT INTO exception_codes
					 (id, nim, reason, requested_by, approved_by, approved_at, code_hash, expires_at, solo)
					 VALUES (?, ?, 'Akun terkunci', ?, ?, unixepoch(), ?, unixepoch() + 300, 1)`
				)
				.run(crypto.randomUUID(), BOB, SUPER, SUPER, '4'.repeat(64))
		).not.toThrow();
	});

	it('pengajuan biasa tidak bisa diubah menjadi solo lalu disetujui sendiri', async () => {
		open();
		const req = await requestException(db, ALICE, 'Akun terkunci', ADMIN_A);
		if (!req.ok) throw new Error('pengajuan gagal');
		expect(() =>
			raw
				.prepare(
					`UPDATE exception_codes SET solo = 1, approved_by = requested_by,
					 approved_at = unixepoch(), code_hash = ?, expires_at = unixepoch() + 300 WHERE id = ?`
				)
				.run('3'.repeat(64), req.id)
		).toThrow(/exception_codes_immutable/);
		expect(() =>
			raw.prepare('UPDATE exception_codes SET solo = 1 WHERE id = ?').run(req.id)
		).toThrow(/exception_codes_immutable/);
	});

	it('identitas kode solo tidak bisa diubah atau dihapus', async () => {
		open();
		const issued = await issueExceptionDirect(db, ALICE, 'Akun terkunci', SUPER);
		if (!issued.ok) throw new Error('gagal');
		expect(() =>
			raw.prepare('UPDATE exception_codes SET solo = 0 WHERE id = ?').run(issued.id)
		).toThrow(/exception_codes_immutable/);
		expect(() =>
			raw.prepare('UPDATE exception_codes SET nim = ? WHERE id = ?').run(BOB, issued.id)
		).toThrow(/exception_codes_immutable/);
		expect(() => raw.exec('DELETE FROM exception_codes')).toThrow(/exception_codes_immutable/);
	});
});
