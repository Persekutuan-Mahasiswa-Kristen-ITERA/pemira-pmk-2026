import { describe, expect, it } from 'vitest';
import { normalizeReceiptCode } from './receipt-code';

describe('normalizeReceiptCode', () => {
	it('merapikan kode yang diketik pemilih', () => {
		expect(normalizeReceiptCode(' 7k3qf 92xma ')).toBe('7K3QF-92XMA');
		expect(normalizeReceiptCode('7k3qf-92xma')).toBe('7K3QF-92XMA');
		expect(normalizeReceiptCode('O0IL1-ABCDE')).toBe('00111-ABCDE');
	});

	it('membiarkan masukan yang belum lengkap', () => {
		expect(normalizeReceiptCode('7k3')).toBe('7K3');
	});
});
