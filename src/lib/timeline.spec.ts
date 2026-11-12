import { describe, expect, it } from 'vitest';
import { TIMELINE, timelineStatus, wibDate, type TimelineEvent } from './timeline';

const at = (iso: string) => Date.parse(iso) / 1000;

describe('linimasa', () => {
	const sekolah: TimelineEvent = {
		id: 'x',
		title: 'X',
		start: '2026-10-28',
		end: '2026-11-06',
		date: ''
	};

	it('memakai tanggal WIB, bukan UTC', () => {
		// 18 Nov 2026 17.30 UTC = 19 Nov 2026 00.30 WIB
		expect(wibDate(at('2026-11-18T17:30:00Z'))).toBe('2026-11-19');
		expect(wibDate(at('2026-11-18T16:59:59Z'))).toBe('2026-11-18');
	});

	it('menandai sebelum, selama, dan sesudah rentang tanggal', () => {
		expect(timelineStatus(sekolah, at('2026-10-27T12:00:00Z'))).toBe('upcoming');
		expect(timelineStatus(sekolah, at('2026-10-28T00:00:00Z'))).toBe('today');
		expect(timelineStatus(sekolah, at('2026-11-06T16:59:00Z'))).toBe('today');
		expect(timelineStatus(sekolah, at('2026-11-06T17:00:00Z'))).toBe('done');
	});

	it('berurutan dan tanggalnya valid', () => {
		for (const e of TIMELINE) {
			expect(e.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(e.end >= e.start).toBe(true);
		}
		const starts = TIMELINE.map((e) => e.start);
		expect([...starts].sort()).toEqual(starts);
		expect(new Set(TIMELINE.map((e) => e.id)).size).toBe(TIMELINE.length);
	});
});
