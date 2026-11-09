/**
 * Normalisasi kode tanda terima yang diketik pemilih: huruf besar, tanpa spasi,
 * huruf yang mirip angka dikoreksi (aturan Crockford: O→0, I/L→1), dan tanda
 * hubung dipasang di tengah.
 */
export function normalizeReceiptCode(input: string): string {
	const chars = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
	return chars.length === 10 ? `${chars.slice(0, 5)}-${chars.slice(5)}` : chars;
}
