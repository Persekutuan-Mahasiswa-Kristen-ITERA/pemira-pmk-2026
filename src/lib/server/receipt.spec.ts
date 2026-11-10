import { describe, expect, it } from 'vitest';
import { generateReceiptCode, RECEIPT_ALPHABET } from './receipt';

describe('generateReceiptCode', () => {
	it('berformat XXXXX-XXXXX dengan alfabet Crockford', () => {
		for (let i = 0; i < 200; i++) {
			const code = generateReceiptCode();
			expect(code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/);
			for (const ch of code.replace('-', '')) expect(RECEIPT_ALPHABET).toContain(ch);
			expect(code).not.toMatch(/[ILOU]/);
		}
	});

	it('alfabet berisi tepat 32 karakter unik (tanpa bias modulo)', () => {
		expect(new Set(RECEIPT_ALPHABET).size).toBe(32);
	});

	it('tidak menghasilkan kode yang sama dalam 10.000 percobaan', () => {
		const codes = new Set(Array.from({ length: 10_000 }, generateReceiptCode));
		expect(codes.size).toBe(10_000);
	});
});
