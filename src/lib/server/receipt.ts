/** Alfabet Crockford Base32: tanpa I, L, O, U supaya tidak tertukar saat dibaca/ditulis. */
export const RECEIPT_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Kode tanda terima acak, format `XXXXX-XXXXX` (10 karakter, 50 bit).
 * Memakai CSPRNG (crypto.getRandomValues). Alfabet berisi tepat 32 karakter,
 * sehingga `byte & 31` tidak menimbulkan bias.
 */
export function generateReceiptCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(10));
	const chars = Array.from(bytes, (b) => RECEIPT_ALPHABET[b & 31]).join('');
	return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}
