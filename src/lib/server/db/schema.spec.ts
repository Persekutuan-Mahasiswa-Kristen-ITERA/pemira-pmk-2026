/**
 * Tes aturan database di migrations/*.sql.
 *
 * Memakai SQLite bawaan Node (node:sqlite), yang menjalankan SQL dan trigger
 * yang sama dengan Cloudflare D1. Transaksi BEGIN/COMMIT di sini meniru
 * `DB.batch()` di D1, yang juga atomik.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { freshDb, grantPass } from '../testing/sqlite';

const now = () => Math.floor(Date.now() / 1000);

function setSchedule(db: DatabaseSync, opensAt: number, closesAt: number) {
	db.prepare('UPDATE election_config SET opens_at = ?, closes_at = ? WHERE id = 1').run(
		opensAt,
		closesAt
	);
}

/** Meniru alur suara di aplikasi: izin dari kode TPS, lalu dua insert dalam satu transaksi. */
function castVote(db: DatabaseSync, nim: string, code: string, candidateId: number) {
	const hasPasses = db
		.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'vote_passes'")
		.get();
	// Database dari migrasi lama (sebelum 0004) belum mengenal izin memilih.
	if (hasPasses && db.prepare('SELECT 1 FROM voters WHERE nim = ?').get(nim)) grantPass(db, nim);
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

const count = (db: DatabaseSync, table: string) =>
	(db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

const ALICE = '122140001';
const BOB = '122140002';
const OUTSIDER = '122140099';

let db: DatabaseSync;

beforeEach(() => {
	db = freshDb();
	db.prepare('INSERT INTO candidates (id, number, name) VALUES (1, 1, ?), (2, 2, ?)').run(
		'Calon Satu',
		'Calon Dua'
	);
	db.prepare('INSERT INTO voters (nim, name) VALUES (?, ?), (?, ?)').run(
		ALICE,
		'Alice',
		BOB,
		'Bob'
	);
});

describe('sebelum pemilihan dibuka', () => {
	it('menolak suara jika jadwal belum diatur', () => {
		expect(() => castVote(db, ALICE, 'AAAA-BBBB', 1)).toThrow(/voting_closed/);
		expect(count(db, 'voted')).toBe(0);
		expect(count(db, 'ballots')).toBe(0);
	});

	it('menolak suara jika waktu buka belum tiba', () => {
		setSchedule(db, now() + 3600, now() + 7200);
		expect(() => castVote(db, ALICE, 'AAAA-BBBB', 1)).toThrow(/voting_closed/);
	});

	it('masih boleh mengubah jadwal, DPT, dan calon', () => {
		setSchedule(db, now() + 3600, now() + 7200);
		setSchedule(db, now() + 1800, now() + 9000);
		db.prepare('INSERT INTO voters (nim, name) VALUES (?, ?)').run(OUTSIDER, 'Eve');
		db.prepare('DELETE FROM voters WHERE nim = ?').run(OUTSIDER);
		db.prepare('UPDATE candidates SET vision = ? WHERE id = 1').run('Visi baru');
		expect(count(db, 'voters')).toBe(2);
	});

	it('menolak jadwal dengan waktu tutup sebelum waktu buka', () => {
		expect(() => setSchedule(db, now() + 7200, now() + 3600)).toThrow(/CHECK/);
	});
});

describe('saat pemilihan berlangsung', () => {
	beforeEach(() => setSchedule(db, now() - 60, now() + 3600));

	it('mencatat pemilih dan surat suara secara terpisah', () => {
		castVote(db, ALICE, 'AAAA-BBBB', 2);
		expect(db.prepare('SELECT * FROM voted').all()).toEqual([{ nim: ALICE }]);
		expect(db.prepare('SELECT * FROM ballots').all()).toEqual([
			{ code: 'AAAA-BBBB', candidate_id: 2 }
		]);
	});

	it('menolak suara ganda dan membatalkan surat suara keduanya', () => {
		castVote(db, ALICE, 'AAAA-BBBB', 1);
		expect(() => castVote(db, ALICE, 'CCCC-DDDD', 2)).toThrow(/UNIQUE|PRIMARY KEY/);
		expect(count(db, 'voted')).toBe(1);
		expect(count(db, 'ballots')).toBe(1);
	});

	it('menolak NIM yang tidak ada di DPT', () => {
		expect(() => castVote(db, OUTSIDER, 'AAAA-BBBB', 1)).toThrow(/not_eligible/);
		expect(count(db, 'ballots')).toBe(0);
	});

	it('menolak calon yang tidak ada dan membatalkan penanda sudah memilih', () => {
		expect(() => castVote(db, ALICE, 'AAAA-BBBB', 99)).toThrow(/FOREIGN KEY/);
		expect(count(db, 'voted')).toBe(0);
	});

	it('menolak kode tanda terima yang sudah dipakai', () => {
		castVote(db, ALICE, 'AAAA-BBBB', 1);
		expect(() => castVote(db, BOB, 'AAAA-BBBB', 2)).toThrow(/UNIQUE|PRIMARY KEY/);
		expect(count(db, 'voted')).toBe(1);
	});

	it('surat suara tidak bisa diubah atau dihapus', () => {
		castVote(db, ALICE, 'AAAA-BBBB', 1);
		expect(() => db.exec('UPDATE ballots SET candidate_id = 2')).toThrow(/ballots_immutable/);
		expect(() => db.exec('DELETE FROM ballots')).toThrow(/ballots_immutable/);
	});

	it('penanda sudah memilih tidak bisa diubah atau dihapus', () => {
		castVote(db, ALICE, 'AAAA-BBBB', 1);
		expect(() => db.exec(`UPDATE voted SET nim = '${BOB}'`)).toThrow(/voted_immutable/);
		expect(() => db.exec('DELETE FROM voted')).toThrow(/voted_immutable/);
	});

	it('DPT terkunci', () => {
		expect(() =>
			db.prepare('INSERT INTO voters (nim, name) VALUES (?, ?)').run(OUTSIDER, 'Eve')
		).toThrow(/voters_locked/);
		expect(() => db.prepare('DELETE FROM voters WHERE nim = ?').run(BOB)).toThrow(/voters_locked/);
		expect(() => db.exec("UPDATE voters SET name = 'X'")).toThrow(/voters_locked/);
	});

	it('daftar calon terkunci', () => {
		expect(() =>
			db.prepare('INSERT INTO candidates (number, name) VALUES (3, ?)').run('Calon Tiga')
		).toThrow(/candidates_locked/);
		expect(() => db.exec("UPDATE candidates SET name = 'X'")).toThrow(/candidates_locked/);
		expect(() => db.exec('DELETE FROM candidates')).toThrow(/candidates_locked/);
	});

	it('jadwal tidak bisa diperpanjang atau digeser', () => {
		const { closes_at } = db.prepare('SELECT closes_at FROM election_config').get() as {
			closes_at: number;
		};
		expect(() =>
			db.prepare('UPDATE election_config SET closes_at = ?').run(closes_at + 60)
		).toThrow(/schedule_locked/);
		expect(() => db.prepare('UPDATE election_config SET opens_at = ?').run(now() - 30)).toThrow(
			/schedule_locked/
		);
		expect(() => db.exec("UPDATE election_config SET title = 'X'")).toThrow(/schedule_locked/);
	});

	it('tutup darurat tidak boleh ke waktu yang sudah lewat', () => {
		expect(() => db.prepare('UPDATE election_config SET closes_at = ?').run(now() - 30)).toThrow(
			/schedule_locked/
		);
	});

	it('tutup darurat menghentikan pemungutan suara', () => {
		castVote(db, ALICE, 'AAAA-BBBB', 1);
		db.exec('UPDATE election_config SET closes_at = unixepoch()');
		expect(() => castVote(db, BOB, 'CCCC-DDDD', 2)).toThrow(/voting_closed/);
		expect(count(db, 'voted')).toBe(count(db, 'ballots'));
	});
});

describe('setelah pemilihan ditutup', () => {
	beforeEach(() => setSchedule(db, now() - 7200, now() - 60));

	it('menolak suara', () => {
		expect(() => castVote(db, ALICE, 'AAAA-BBBB', 1)).toThrow(/voting_closed/);
	});

	it('menolak memasukkan surat suara secara langsung', () => {
		expect(() =>
			db.prepare('INSERT INTO ballots (code, candidate_id) VALUES (?, ?)').run('ZZZZ-ZZZZ', 1)
		).toThrow(/voting_closed/);
	});

	it('jadwal tidak bisa dibuka kembali', () => {
		expect(() => db.prepare('UPDATE election_config SET closes_at = ?').run(now() + 3600)).toThrow(
			/schedule_locked/
		);
	});
});

describe('kerahasiaan dan integritas data', () => {
	it('tabel surat suara tidak punya kolom identitas atau waktu', () => {
		const columns = (db.prepare('PRAGMA table_info(ballots)').all() as { name: string }[]).map(
			(c) => c.name
		);
		expect(columns).toEqual(['code', 'candidate_id']);
	});

	it('tabel surat suara tidak punya rowid berurutan', () => {
		expect(() => db.exec('SELECT rowid FROM ballots')).toThrow(/no such column/);
	});

	it('NIM DPT hanya angka 8–12 digit', () => {
		const insert = db.prepare('INSERT INTO voters (nim, name) VALUES (?, ?)');
		expect(() => insert.run('carol.122140003@student.itera.ac.id', 'Carol')).toThrow(/CHECK/);
		expect(() => insert.run(' 122140003', 'Carol')).toThrow(/CHECK/);
		expect(() => insert.run('12214000A', 'Carol')).toThrow(/CHECK/);
		expect(() => insert.run('1221', 'Carol')).toThrow(/CHECK/);
		insert.run('122140003', 'Carol');
		expect(count(db, 'voters')).toBe(3);
	});

	it('audit log tidak bisa diubah atau dihapus', () => {
		db.prepare('INSERT INTO audit_log (actor_email, action) VALUES (?, ?)').run(
			'admin@itera.ac.id',
			'test'
		);
		expect(() => db.exec("UPDATE audit_log SET action = 'x'")).toThrow(/audit_log_immutable/);
		expect(() => db.exec('DELETE FROM audit_log')).toThrow(/audit_log_immutable/);
	});

	it('konfigurasi pemilihan tidak bisa dihapus', () => {
		expect(() => db.exec('DELETE FROM election_config')).toThrow(/election_config_immutable/);
	});
});

describe('migrasi 0002 (DPT berbasis NIM)', () => {
	const migration = (name: string) => readFileSync(join(process.cwd(), 'migrations', name), 'utf8');

	function dbAt0001(): DatabaseSync {
		const old = new DatabaseSync(':memory:');
		old.exec('PRAGMA foreign_keys = ON;');
		old.exec(migration('0001_init.sql'));
		return old;
	}

	it('berjalan jika belum ada suara', () => {
		const old = dbAt0001();
		old.exec("INSERT INTO voters (email, name) VALUES ('a.122140001@student.itera.ac.id', 'A')");
		old.exec(migration('0002_voters_by_nim.sql'));
		const columns = (old.prepare('PRAGMA table_info(voters)').all() as { name: string }[]).map(
			(c) => c.name
		);
		expect(columns).toEqual(['nim', 'name']);
	});

	it('menolak berjalan jika sudah ada suara', () => {
		const old = dbAt0001();
		old.exec(`INSERT INTO candidates (id, number, name) VALUES (1, 1, 'Satu')`);
		old.exec("INSERT INTO voters (email, name) VALUES ('a.122140001@student.itera.ac.id', 'A')");
		setSchedule(old, now() - 60, now() + 3600);
		old.exec("INSERT INTO voted (email) VALUES ('a.122140001@student.itera.ac.id')");
		expect(() => old.exec(migration('0002_voters_by_nim.sql'))).toThrow(/CHECK/);
		expect(count(old, 'voted')).toBe(1);
	});
});

describe('foto calon', () => {
	const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
	const putPhoto = (candidateId: number) =>
		db
			.prepare(
				`INSERT INTO candidate_photos (candidate_id, mime, data) VALUES (?, 'image/png', ?)
				 ON CONFLICT (candidate_id) DO UPDATE SET data = excluded.data`
			)
			.run(candidateId, PNG);

	it('boleh diunggah, diganti, dan dihapus sebelum pemilihan dibuka', () => {
		setSchedule(db, now() + 3600, now() + 7200);
		putPhoto(1);
		putPhoto(1);
		expect(count(db, 'candidate_photos')).toBe(1);
		db.prepare('DELETE FROM candidate_photos WHERE candidate_id = 1').run();
		expect(count(db, 'candidate_photos')).toBe(0);
	});

	it('terkunci setelah pemilihan dibuka', () => {
		putPhoto(1);
		setSchedule(db, now() - 60, now() + 3600);
		expect(() => putPhoto(2)).toThrow(/candidates_locked/);
		expect(() => putPhoto(1)).toThrow(/candidates_locked/);
		expect(() => db.prepare('DELETE FROM candidate_photos').run()).toThrow(/candidates_locked/);
	});

	it('hanya menerima jenis gambar yang diizinkan', () => {
		expect(() =>
			db
				.prepare(
					`INSERT INTO candidate_photos (candidate_id, mime, data) VALUES (1, 'image/svg+xml', ?)`
				)
				.run(PNG)
		).toThrow(/CHECK/);
	});

	it('ikut terhapus saat calon dihapus', () => {
		putPhoto(1);
		db.prepare('DELETE FROM candidates WHERE id = 1').run();
		expect(count(db, 'candidate_photos')).toBe(0);
	});
});

describe('admin undangan', () => {
	it('email disimpan dalam huruf kecil tanpa spasi', () => {
		expect(() =>
			db.prepare("INSERT INTO admins (email, invited_by) VALUES ('Panitia@Gmail.com', 'x')").run()
		).toThrow(/CHECK/);
		expect(() =>
			db.prepare("INSERT INTO admins (email, invited_by) VALUES ('bukan-email', 'x')").run()
		).toThrow(/CHECK/);
		db.prepare("INSERT INTO admins (email, invited_by) VALUES ('panitia@gmail.com', 'x')").run();
		expect(count(db, 'admins')).toBe(1);
	});
});

describe('migrasi 0003 (admin dan foto calon)', () => {
	const migration = (name: string) => readFileSync(join(process.cwd(), 'migrations', name), 'utf8');

	it('berjalan saat pemilihan sedang berlangsung tanpa menyentuh suara', () => {
		const old = new DatabaseSync(':memory:');
		old.exec('PRAGMA foreign_keys = ON;');
		old.exec(migration('0001_init.sql'));
		old.exec(migration('0002_voters_by_nim.sql'));
		old.exec(`INSERT INTO candidates (id, number, name, photo_url) VALUES (1, 1, 'Satu', NULL)`);
		old.exec(`INSERT INTO voters (nim, name) VALUES ('${ALICE}', 'Alice')`);
		setSchedule(old, now() - 60, now() + 3600);
		castVote(old, ALICE, 'AAAA-BBBB', 1);

		old.exec(migration('0003_admins_and_photos.sql'));

		const columns = (old.prepare('PRAGMA table_info(candidates)').all() as { name: string }[]).map(
			(c) => c.name
		);
		expect(columns).not.toContain('photo_url');
		expect(count(old, 'ballots')).toBe(1);
		expect(count(old, 'voted')).toBe(1);
	});
});

describe('migrasi 0004 (TPS)', () => {
	const migration = (name: string) => readFileSync(join(process.cwd(), 'migrations', name), 'utf8');

	it('berjalan saat pemilihan sedang berlangsung tanpa menyentuh suara', () => {
		const old = new DatabaseSync(':memory:');
		old.exec('PRAGMA foreign_keys = ON;');
		for (const file of ['0001_init.sql', '0002_voters_by_nim.sql', '0003_admins_and_photos.sql']) {
			old.exec(migration(file));
		}
		old.exec(`INSERT INTO candidates (id, number, name) VALUES (1, 1, 'Satu')`);
		old.exec(`INSERT INTO voters (nim, name) VALUES ('${ALICE}', 'Alice'), ('${BOB}', 'Bob')`);
		setSchedule(old, now() - 60, now() + 3600);
		castVote(old, ALICE, 'AAAA-BBBB', 1);

		old.exec(migration('0004_tps.sql'));

		expect(count(old, 'ballots')).toBe(1);
		expect(count(old, 'voted')).toBe(1);
		// Setelah migrasi, suara tanpa izin memilih ditolak.
		expect(() => old.exec(`INSERT INTO voted (nim) VALUES ('${BOB}')`)).toThrow(/no_pass/);
	});
});
