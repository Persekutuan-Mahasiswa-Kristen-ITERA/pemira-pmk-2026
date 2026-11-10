import { describe, expect, it } from 'vitest';
import { electionPhase } from './election';

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
