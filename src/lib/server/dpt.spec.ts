import { describe, expect, it } from 'vitest';
import { asD1, freshDb } from './testing/sqlite';
import { addVoter, dptFingerprint, dptInsertStatements, listVoterAdditions, parseDpt } from './dpt';

describe('parseDpt', () => {
	it('membaca ekspor kampus: hanya nim dan nama yang diambil, kolom lain diabaikan', () => {
		const csv =
			'\uFEFFNim,Nama,Prodi,Email Mhs\r\n' +
			'122140001,"Simanjuntak, Budi",Informatika,budi.122140001@student.itera.ac.id\r\n' +
			'122140002,Ani,Fisika,\r\n';
		expect(parseDpt(csv)).toEqual({
			voters: [
				{ nim: '122140001', name: 'Simanjuntak, Budi' },
				{ nim: '122140002', name: 'Ani' }
			],
			errors: []
		});
	});

	it('membaca CSV tanpa judul dan pemisah titik koma (Excel)', () => {
		const csv = '122140001;"Budi, S.T."\n\nAni;122140002';
		expect(parseDpt(csv).voters).toEqual([
			{ nim: '122140001', name: 'Budi, S.T.' },
			{ nim: '122140002', name: 'Ani' }
		]);
	});

	it('melaporkan NIM yang tidak valid, kosong, atau ganda', () => {
		const csv = ['nim,nama', '122140001,Budi', '12214000X,Budi', '122140001,Budi lagi', ',X'].join(
			'\n'
		);
		const { errors } = parseDpt(csv);
		expect(errors).toHaveLength(3);
		expect(errors[0]).toContain('Baris 3');
		expect(errors[1]).toContain('ganda');
	});

	it('menolak berkas kosong', () => {
		expect(parseDpt('nim,nama\n').errors).toEqual(['Berkas tidak berisi data pemilih.']);
	});
});

describe('dptInsertStatements', () => {
	it('memasukkan ribuan pemilih dengan sedikit statement', async () => {
		const raw = freshDb();
		const db = asD1(raw);
		const voters = Array.from({ length: 4500 }, (_, i) => ({
			nim: String(120000000 + i),
			name: i === 0 ? 'Nama, dengan "kutip"' : `Pemilih ${i}`
		}));
		const statements = dptInsertStatements(db, voters);
		expect(statements).toHaveLength(5);
		await db.batch(statements);
		expect(raw.prepare('SELECT count(*) AS n FROM voters').get()).toEqual({ n: 4500 });
		expect(raw.prepare("SELECT name FROM voters WHERE nim = '120000000'").get()).toEqual({
			name: 'Nama, dengan "kutip"'
		});
	});
});

describe('dptFingerprint', () => {
	it('tidak bergantung urutan, tetapi berubah jika isi berubah', async () => {
		const a = await dptFingerprint(['122140002', '122140001']);
		const b = await dptFingerprint(['122140001', '122140002']);
		const c = await dptFingerprint(['122140001']);
		expect(a).toBe(b);
		expect(a).not.toBe(c);
		expect(a).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('addVoter (super admin menambah pemilih)', () => {
	const audit = (db: D1Database, nim: string) =>
		db
			.prepare(
				"INSERT INTO audit_log (actor_email, action, detail) VALUES ('super@x.id', 'dpt.add', ?)"
			)
			.bind(JSON.stringify({ nim }));

	function openElection() {
		const raw = freshDb();
		raw.exec("INSERT INTO voters (nim, name) VALUES ('122140001', 'Alice')");
		raw.exec(
			'UPDATE election_config SET opens_at = unixepoch() - 60, closes_at = unixepoch() + 3600'
		);
		return { raw, db: asD1(raw) };
	}

	it('saat pemilihan dibuka: menambah ke DPT, mencatat penambahan, dan audit log', async () => {
		const { raw, db } = openElection();
		const input = { nim: '122140099', name: 'Eve', reason: 'Dicek BAAK', addedBy: 'super@x.id' };
		expect(await addVoter(db, input, audit(db, input.nim))).toEqual({ ok: true });
		expect(raw.prepare("SELECT name FROM voters WHERE nim = '122140099'").get()).toEqual({
			name: 'Eve'
		});
		expect(raw.prepare('SELECT action FROM audit_log').all()).toEqual([{ action: 'dpt.add' }]);
		const [addition] = await listVoterAdditions(db);
		expect(addition).toMatchObject({
			nim: '122140099',
			name: 'Eve',
			reason: 'Dicek BAAK',
			addedBy: 'super@x.id',
			inDpt: true
		});
	});

	it('menolak NIM yang sudah ada di DPT tanpa mencatat apa pun', async () => {
		const { raw, db } = openElection();
		const input = { nim: '122140001', name: 'Alice', reason: 'Dicek', addedBy: 'super@x.id' };
		expect(await addVoter(db, input, audit(db, input.nim))).toEqual({
			ok: false,
			reason: 'exists'
		});
		expect(raw.prepare('SELECT count(*) AS n FROM voter_additions').get()).toEqual({ n: 0 });
		expect(raw.prepare('SELECT count(*) AS n FROM audit_log').get()).toEqual({ n: 0 });
	});

	it('setelah ditutup: ditolak database, tidak ada yang tersimpan', async () => {
		const { raw, db } = openElection();
		raw.exec('UPDATE election_config SET closes_at = unixepoch()');
		const input = { nim: '122140099', name: 'Eve', reason: 'Dicek', addedBy: 'super@x.id' };
		await expect(addVoter(db, input, audit(db, input.nim))).rejects.toThrow(/voting_closed/);
		expect(raw.prepare('SELECT count(*) AS n FROM voters').get()).toEqual({ n: 1 });
		expect(raw.prepare('SELECT count(*) AS n FROM audit_log').get()).toEqual({ n: 0 });
	});

	it('menandai pemilih tambahan yang hilang karena DPT diganti sebelum dibuka', async () => {
		const raw = freshDb();
		const db = asD1(raw);
		const input = { nim: '122140099', name: 'Eve', reason: 'Dicek', addedBy: 'super@x.id' };
		await addVoter(db, input, audit(db, input.nim));
		await db.batch([db.prepare('DELETE FROM voters'), ...dptInsertStatements(db, [])]);
		expect((await listVoterAdditions(db))[0].inDpt).toBe(false);
	});
});
