import { describe, expect, it } from 'vitest';
import { unixToWibInput, wibInputToUnix } from './time';

describe('waktu WIB', () => {
	it('membaca input sebagai WIB (UTC+7)', () => {
		// 1 Maret 2027 08:00 WIB = 1 Maret 2027 01:00 UTC
		expect(wibInputToUnix('2027-03-01T08:00')).toBe(Date.UTC(2027, 2, 1, 1, 0) / 1000);
	});

	it('bolak-balik tanpa perubahan', () => {
		expect(unixToWibInput(wibInputToUnix('2027-03-01T23:59'))).toBe('2027-03-01T23:59');
	});

	it('menolak format atau tanggal yang tidak valid', () => {
		expect(wibInputToUnix('')).toBeNull();
		expect(wibInputToUnix('2027-02-31T08:00')).toBeNull();
		expect(wibInputToUnix('2027-03-01T24:00')).toBeNull();
		expect(wibInputToUnix('01/03/2027 08:00')).toBeNull();
	});
});
