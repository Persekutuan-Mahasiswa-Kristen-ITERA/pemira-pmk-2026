import { describe, expect, it } from 'vitest';
import { electionPhase, isPublicTest } from './election';
import { asD1, freshDb } from './testing/sqlite';

const config = { title: 'T', opensAt: 1000, closesAt: 2000 };

describe('electionPhase', () => {
	it('belum dijadwalkan bila waktu kosong', () => {
		expect(electionPhase({ title: 'T', opensAt: null, closesAt: null }, 1500)).toBe('unscheduled');
	});

	it('mengikuti batas jendela yang sama dengan trigger database', () => {
		expect(electionPhase(config, 999)).toBe('upcoming');
		expect(electionPhase(config, 1000)).toBe('open');
		expect(electionPhase(config, 1999)).toBe('open');
		expect(electionPhase(config, 2000)).toBe('closed');
	});
});

describe('isPublicTest', () => {
	it('mati secara default dan menyala setelah skrip uji coba publik', async () => {
		const db = freshDb();
		expect(await isPublicTest(asD1(db))).toBe(false);
		db.exec('UPDATE election_config SET public_test = 1 WHERE id = 1');
		expect(await isPublicTest(asD1(db))).toBe(true);
	});
});
