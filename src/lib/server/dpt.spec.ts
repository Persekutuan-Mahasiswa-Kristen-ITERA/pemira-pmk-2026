import { describe, expect, it } from 'vitest';
import { asD1, freshDb } from './testing/sqlite';
import { dptFingerprint, dptInsertStatements, parseDpt } from './dpt';

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
