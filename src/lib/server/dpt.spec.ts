import { describe, expect, it } from 'vitest';
import { dptFingerprint, parseDpt } from './dpt';

describe('parseDpt', () => {
	it('membaca CSV berjudul dengan urutan kolom bebas', () => {
		const csv =
			'\uFEFFnama,email\r\n"Simanjuntak, Budi",Budi.122140001@student.itera.ac.id\r\nAni,ani.122140002@student.itera.ac.id\r\n';
		expect(parseDpt(csv)).toEqual({
			voters: [
				{ email: 'budi.122140001@student.itera.ac.id', name: 'Simanjuntak, Budi' },
				{ email: 'ani.122140002@student.itera.ac.id', name: 'Ani' }
			],
			errors: []
		});
	});

	it('membaca CSV tanpa judul dan pemisah titik koma (Excel)', () => {
		const csv = 'budi.122140001@student.itera.ac.id;Budi\n\nAni;ani.122140002@student.itera.ac.id';
		expect(parseDpt(csv).voters.map((v) => v.email)).toEqual([
			'budi.122140001@student.itera.ac.id',
			'ani.122140002@student.itera.ac.id'
		]);
	});

	it('melaporkan email yang salah domain atau ganda', () => {
		const csv = [
			'email,nama',
			'budi.122140001@student.itera.ac.id,Budi',
			'budi@gmail.com,Budi',
			'BUDI.122140001@student.itera.ac.id,Budi lagi',
			'tanpa-email,X'
		].join('\n');
		const { errors } = parseDpt(csv);
		expect(errors).toHaveLength(3);
		expect(errors[0]).toContain('Baris 3');
		expect(errors[1]).toContain('ganda');
	});

	it('menolak berkas kosong', () => {
		expect(parseDpt('email,nama\n').errors).toEqual(['Berkas tidak berisi data pemilih.']);
	});
});

describe('dptFingerprint', () => {
	it('tidak bergantung urutan, tetapi berubah jika isi berubah', async () => {
		const a = await dptFingerprint(['b@student.itera.ac.id', 'a@student.itera.ac.id']);
		const b = await dptFingerprint(['a@student.itera.ac.id', 'b@student.itera.ac.id']);
		const c = await dptFingerprint(['a@student.itera.ac.id']);
		expect(a).toBe(b);
		expect(a).not.toBe(c);
		expect(a).toMatch(/^[0-9a-f]{64}$/);
	});
});
