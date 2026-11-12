import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTIVITIES } from './kegiatan';

/** Lebar × tinggi dari header WebP (VP8, VP8L, atau VP8X). */
function webpSize(file: string): [number, number] {
	const b = readFileSync(file);
	expect(b.toString('ascii', 0, 4)).toBe('RIFF');
	expect(b.toString('ascii', 8, 12)).toBe('WEBP');
	const chunk = b.toString('ascii', 12, 16);
	if (chunk === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
	if (chunk === 'VP8L') {
		const bits = b.readUInt32LE(21);
		return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
	}
	return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

describe('dokumentasi kegiatan', () => {
	const photos = ACTIVITIES.flatMap((a) => a.photos);

	it('setiap foto dan versi kecilnya ada di static/', () => {
		for (const p of photos) {
			expect(existsSync(`static${p.src}`), p.src).toBe(true);
			expect(existsSync(`static${p.thumb}`), p.thumb).toBe(true);
		}
	});

	it('ukuran yang dicatat sama dengan ukuran berkas', () => {
		for (const p of photos) expect(webpSize(`static${p.src}`), p.src).toEqual([p.width, p.height]);
	});

	it('id kegiatan unik', () => {
		expect(new Set(ACTIVITIES.map((a) => a.id)).size).toBe(ACTIVITIES.length);
	});
});
