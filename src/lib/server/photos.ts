/** Foto calon: validasi berkas yang diunggah dan konversi hasil baca D1. */

/** Batas ukuran setelah diperkecil di browser; jauh di bawah batas baris D1 (2 MB). */
export const MAX_PHOTO_BYTES = 700_000;

export type PhotoMime = 'image/webp' | 'image/jpeg' | 'image/png';

/**
 * Tentukan jenis gambar dari isi berkas (magic bytes), bukan dari nama atau tipe yang
 * dikirim browser. Hanya WebP, JPEG, dan PNG yang diterima; SVG sengaja ditolak.
 */
export function sniffImageType(bytes: Uint8Array): PhotoMime | null {
	const at = (i: number) => bytes[i];
	if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';
	if (
		bytes.length >= 8 &&
		[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)
	) {
		return 'image/png';
	}
	const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
	if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
	return null;
}

/** D1 mengembalikan BLOB sebagai array angka; SQLite lokal sebagai Uint8Array. */
export function blobToBytes(value: unknown): Uint8Array {
	if (value instanceof Uint8Array) return value;
	if (value instanceof ArrayBuffer) return new Uint8Array(value);
	if (ArrayBuffer.isView(value)) {
		return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
	}
	if (Array.isArray(value)) return Uint8Array.from(value as number[]);
	throw new TypeError('Format BLOB tidak dikenal');
}
