import { describe, expect, it } from 'vitest';
import { blobToBytes, sniffImageType } from './photos';

const bytes = (...values: (number | string)[]) =>
	new Uint8Array(
		values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v]))
	);

describe('sniffImageType', () => {
	it('mengenali JPEG, PNG, dan WebP dari isi berkas', () => {
		expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
		expect(sniffImageType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
		expect(sniffImageType(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))).toBe('image/webp');
	});

	it('menolak SVG, GIF, dan berkas yang terpotong', () => {
		expect(sniffImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
		expect(sniffImageType(bytes('GIF89a'))).toBeNull();
		expect(sniffImageType(bytes(0xff, 0xd8))).toBeNull();
		expect(sniffImageType(bytes('RIFF', 0, 0, 0, 0, 'WAVE'))).toBeNull();
	});
});

describe('blobToBytes', () => {
	it('menerima bentuk BLOB dari D1 maupun SQLite lokal', () => {
		expect(blobToBytes([1, 2, 3])).toEqual(new Uint8Array([1, 2, 3]));
		expect(blobToBytes(new Uint8Array([4, 5]))).toEqual(new Uint8Array([4, 5]));
		expect(blobToBytes(new Uint8Array([6]).buffer)).toEqual(new Uint8Array([6]));
	});
});
