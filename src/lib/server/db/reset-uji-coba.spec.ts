/**
 * Tes `scripts/reset-uji-coba.sql`: reset uji coba publik di database production.
 *
 * Yang dijamin:
 * - data pemilihan uji (suara, tanda sudah memilih, kode, izin, audit log, jadwal) hilang;
 * - calon, foto, DPT, admin, Petugas TPS, dan judul tetap;
 * - semua trigger penjaga kembali PERSIS seperti setelah migrasi (tidak ada yang hilang/berubah);
 * - skrip menolak berjalan bila mode uji coba publik tidak menyala (mis. saat pemilihan resmi).
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { freshDb, grantPass } from '../testing/sqlite';

const RESET_SQL = readFileSync(join(process.cwd(), 'scripts', 'reset-uji-coba.sql'), 'utf8');
const ON_SQL = readFileSync(join(process.cwd(), 'scripts', 'uji-coba-publik-on.sql'), 'utf8');

const now = () => Math.floor(Date.now() / 1000);
const hash = (c: string) => c.repeat(64);
const count = (db: DatabaseSync, table: string) =>
	(db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

/** Skema (tabel, indeks, trigger) dengan spasi dinormalkan, untuk dibandingkan sebelum/sesudah. */
function schema(db: DatabaseSync) {
	return (
		db
			.prepare(
				"SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name"
			)
			.all() as { type: string; name: string; sql: string | null }[]
	).map((r) => ({ ...r, sql: r.sql?.replace(/\s+/g, ' ').trim() ?? null }));
}

function config(db: DatabaseSync) {
	return db
		.prepare('SELECT title, opens_at, closes_at, audit_public, public_test FROM election_config')
		.get();
}

function castVote(db: DatabaseSync, nim: string, code: string, candidateId: number) {
	grantPass(db, nim);
	db.exec('BEGIN');
	try {
		db.prepare('INSERT INTO voted (nim) VALUES (?)').run(nim);
		db.prepare('INSERT INTO ballots (code, candidate_id) VALUES (?, ?)').run(code, candidateId);
		db.exec('COMMIT');
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}

const ALICE = '122140001';
const BOB = '122140002';
const CAROL = '122140003';

let db: DatabaseSync;
let schemaAfterMigrations: ReturnType<typeof schema>;

beforeEach(() => {
	db = freshDb();
	schemaAfterMigrations = schema(db);
	db.exec(ON_SQL);

	// Disiapkan sebelum uji dibuka: calon, foto, DPT, admin, petugas.
	db.prepare(
		"INSERT INTO candidates (id, number, name, vision, mission) VALUES (1, 1, 'Calon Satu', 'Visi 1', 'Misi 1'), (2, 2, 'Calon Dua', 'Visi 2', 'Misi 2')"
	).run();
	db.prepare(
		"INSERT INTO candidate_photos (candidate_id, mime, data) VALUES (1, 'image/webp', x'0102')"
	).run();
	db.prepare("INSERT INTO voters (nim, name) VALUES (?, 'Alice'), (?, 'Bob'), (?, 'Carol')").run(
		ALICE,
		BOB,
		CAROL
	);
	db.prepare("INSERT INTO admins (email, invited_by) VALUES ('admin@x.id', 'super@x.id')").run();
	db.prepare(
		"INSERT INTO officers (email, invited_by) VALUES ('petugas@x.id', 'admin@x.id')"
	).run();

	// Uji coba berjalan: jadwal dibuka, suara masuk, kode dibuat, aksi admin tercatat.
	db.prepare('UPDATE election_config SET opens_at = ?, closes_at = ?, audit_public = 1').run(
		now() - 60,
		now() + 3600
	);
	castVote(db, ALICE, 'AAAA-BBBB', 1);
	castVote(db, BOB, 'CCCC-DDDD', 2);
	grantPass(db, CAROL); // izin yang belum dipakai
	db.prepare(
		"INSERT INTO booth_codes (code_hash, created_by, expires_at) VALUES (?, 'petugas@x.id', unixepoch() + 120)"
	).run(hash('a'));
	db.prepare(
		`INSERT INTO exception_codes (id, nim, reason, requested_by, approved_by, approved_at, code_hash, expires_at)
		 VALUES ('e1', ?, 'HP rusak', 'admin@x.id', 'super@x.id', unixepoch(), ?, unixepoch() + 600)`
	).run(CAROL, hash('b'));
	db.prepare(
		"INSERT INTO audit_log (actor_email, action, detail) VALUES ('admin@x.id', 'jadwal', '{}')"
	).run();
});

describe('reset uji coba publik', () => {
	it('menghapus semua data pemilihan uji', () => {
		db.exec(RESET_SQL);
		for (const table of ['ballots', 'voted', 'vote_passes', 'booth_codes', 'exception_codes']) {
			expect(count(db, table), table).toBe(0);
		}
	});

	it('mengosongkan jadwal, menutup audit publik, dan mematikan pita uji coba', () => {
		db.exec(RESET_SQL);
		expect(config(db)).toEqual({
			title: 'Pemilihan Ketua PMK ITERA 2027',
			opens_at: null,
			closes_at: null,
			audit_public: 0,
			public_test: 0
		});
	});

	it('menyisakan hanya satu entri audit log: penanda reset', () => {
		db.exec(RESET_SQL);
		expect(db.prepare('SELECT actor_email, action FROM audit_log').all()).toEqual([
			{ actor_email: 'sistem', action: 'reset_uji_coba_publik' }
		]);
	});

	it('mempertahankan calon, foto, DPT, admin, dan Petugas TPS', () => {
		const keep = ['candidates', 'candidate_photos', 'voters', 'admins', 'officers'];
		const before = keep.map((t) => db.prepare(`SELECT * FROM ${t}`).all());
		db.exec(RESET_SQL);
		expect(keep.map((t) => db.prepare(`SELECT * FROM ${t}`).all())).toEqual(before);
	});

	it('mengembalikan skema dan semua trigger persis seperti setelah migrasi', () => {
		db.exec(RESET_SQL);
		expect(schema(db)).toEqual(schemaAfterMigrations);
	});

	it('setelah reset, aturan pemilihan berlaku lagi untuk pemilihan resmi', () => {
		db.exec(RESET_SQL);
		// Calon dan DPT bisa dirapikan lagi karena jadwal kosong.
		db.prepare("UPDATE candidates SET vision = 'Visi final' WHERE id = 1").run();
		db.prepare('UPDATE election_config SET opens_at = ?, closes_at = ?').run(
			now() - 1,
			now() + 3600
		);

		castVote(db, ALICE, 'EEEE-FFFF', 1); // Alice boleh memilih lagi
		expect(() => castVote(db, ALICE, 'GGGG-HHHH', 2)).toThrow(/UNIQUE|PRIMARY KEY/);
		expect(() => db.prepare('DELETE FROM ballots').run()).toThrow(/ballots_immutable/);
		expect(() => db.prepare('DELETE FROM voted').run()).toThrow(/voted_immutable/);
		expect(() => db.prepare('DELETE FROM audit_log').run()).toThrow(/audit_log_immutable/);
		expect(() => db.prepare('UPDATE election_config SET opens_at = opens_at + 1').run()).toThrow(
			/schedule_locked/
		);
		expect(() => db.prepare("UPDATE candidates SET name = 'X'").run()).toThrow(/candidates_locked/);
	});

	it('menolak berjalan bila mode uji coba publik tidak menyala, tanpa mengubah apa pun', () => {
		db.exec(RESET_SQL);
		db.prepare('UPDATE election_config SET opens_at = ?, closes_at = ?').run(
			now() - 1,
			now() + 3600
		);
		castVote(db, ALICE, 'EEEE-FFFF', 1); // suara pemilihan resmi

		expect(() => db.exec(RESET_SQL)).toThrow(/CHECK/);
		expect(count(db, 'ballots')).toBe(1);
		expect(count(db, 'voted')).toBe(1);
		expect(config(db)).toMatchObject({ opens_at: expect.any(Number), public_test: 0 });
	});

	it('menolak berjalan di database yang belum pernah dinyalakan mode uji cobanya', () => {
		const fresh = freshDb();
		expect(() => fresh.exec(RESET_SQL)).toThrow(/CHECK/);
	});
});
