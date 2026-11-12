import { describe, expect, it } from 'vitest';
import {
	MIN_SCHEDULE_LEAD_SECONDS,
	electionPhase,
	getElectionStatus,
	isPublicTest,
	scheduleError
} from './election';
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

describe('scheduleError', () => {
	const now = 1_000_000;
	const hour = 3600;

	it('menerima jadwal di masa depan', () => {
		expect(scheduleError(now + 11 * hour, now + 22 * hour, now)).toBeNull();
		expect(scheduleError(now + MIN_SCHEDULE_LEAD_SECONDS + 1, now + hour, now)).toBeNull();
	});

	it('menolak waktu buka yang sudah lewat (salah ketik tanggal)', () => {
		// Rabu malam: tanggal 18 alih-alih 19, 07.00 dan 18.00 sudah lewat.
		expect(scheduleError(now - 13 * hour, now - 2 * hour, now)).toMatch(/masa depan/);
		// Hanya waktu buka yang lampau: pemilihan akan langsung terbuka dan terkunci.
		expect(scheduleError(now - 60, now + 10 * hour, now)).toMatch(/masa depan/);
		expect(scheduleError(now, now + hour, now)).toMatch(/masa depan/);
	});

	it('menolak waktu buka kurang dari 5 menit dari sekarang', () => {
		expect(scheduleError(now + MIN_SCHEDULE_LEAD_SECONDS, now + hour, now)).toMatch(/5 menit/);
		expect(scheduleError(now + 60, now + hour, now)).toMatch(/5 menit/);
	});

	it('menolak waktu tutup yang tidak setelah waktu buka', () => {
		expect(scheduleError(now + hour, now + hour, now)).toMatch(/tutup harus setelah/);
		expect(scheduleError(now + 2 * hour, now + hour, now)).toMatch(/tutup harus setelah/);
	});
});

describe('getElectionStatus', () => {
	it('mengembalikan jam database untuk pemeriksaan jadwal', async () => {
		const db = freshDb();
		const { now } = db.prepare('SELECT unixepoch() AS now').get() as { now: number };
		const status = await getElectionStatus(asD1(db));
		expect(status.phase).toBe('unscheduled');
		expect(Math.abs(status.now - now)).toBeLessThanOrEqual(1);
	});
});
