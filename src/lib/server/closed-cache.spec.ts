import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cachedWhenClosed, clearClosedCache, TTL_MS } from './closed-cache';

const closed = { phase: 'closed' as const, closesAt: 1_000 };

beforeEach(() => clearClosedCache());

describe('cachedWhenClosed', () => {
	it('selalu membaca langsung selama belum ditutup', async () => {
		for (const phase of ['unscheduled', 'upcoming', 'open'] as const) {
			const load = vi.fn(async () => 1);
			const election = { phase, closesAt: phase === 'unscheduled' ? null : 1_000 };
			await cachedWhenClosed('k', election, load);
			await cachedWhenClosed('k', election, load);
			expect(load).toHaveBeenCalledTimes(2);
		}
	});

	it('setelah ditutup, membaca sekali lalu memakai nilai yang sama', async () => {
		const load = vi.fn(async () => ({ eligible: 4, voted: 3, ballots: 3 }));
		const a = await cachedWhenClosed('participation', closed, load);
		const b = await cachedWhenClosed('participation', closed, load);
		expect(load).toHaveBeenCalledTimes(1);
		expect(b).toEqual(a);
	});

	it('kunci berbeda tidak saling memakai nilai', async () => {
		await cachedWhenClosed('a', closed, async () => 'A');
		expect(await cachedWhenClosed('b', closed, async () => 'B')).toBe('B');
	});

	it('jadwal tutup berbeda (mis. setelah reset) membaca ulang', async () => {
		await cachedWhenClosed('k', closed, async () => 'lama');
		expect(await cachedWhenClosed('k', { ...closed, closesAt: 2_000 }, async () => 'baru')).toBe(
			'baru'
		);
	});

	it('membaca ulang setelah TTL habis', async () => {
		let t = 0;
		const now = () => t;
		const load = vi.fn(async () => t);
		await cachedWhenClosed('k', closed, load, now);
		t = TTL_MS - 1;
		await cachedWhenClosed('k', closed, load, now);
		expect(load).toHaveBeenCalledTimes(1);
		t = TTL_MS;
		expect(await cachedWhenClosed('k', closed, load, now)).toBe(TTL_MS);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('kegagalan tidak disimpan', async () => {
		await expect(
			cachedWhenClosed('k', closed, async () => {
				throw new Error('D1 limit');
			})
		).rejects.toThrow('D1 limit');
		expect(await cachedWhenClosed('k', closed, async () => 'ok')).toBe('ok');
	});
});
