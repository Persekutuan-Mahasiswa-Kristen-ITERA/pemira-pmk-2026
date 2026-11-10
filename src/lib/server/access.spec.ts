import { describe, expect, it } from 'vitest';
import { canSignIn, isStudentEmail, isSuperAdminEmail, isValidEmail, nimFromEmail } from './access';

describe('isStudentEmail', () => {
	it('hanya menerima domain student.itera.ac.id persis', () => {
		expect(isStudentEmail('budi.122140001@student.itera.ac.id')).toBe(true);
		expect(isStudentEmail('Budi.122140001@Student.ITERA.ac.id')).toBe(true);
		expect(isStudentEmail('martin.manullang@if.itera.ac.id')).toBe(false);
		expect(isStudentEmail('x@student.itera.ac.id.evil.com')).toBe(false);
		expect(isStudentEmail('x@evilstudent.itera.ac.id')).toBe(false);
		expect(isStudentEmail('@student.itera.ac.id')).toBe(false);
		expect(isStudentEmail('a@b@student.itera.ac.id')).toBe(false);
	});
});

describe('admin', () => {
	const raw = ' Martin.Manullang@if.itera.ac.id , panitia@student.itera.ac.id,, ';

	it('mengenali super admin tanpa peduli huruf besar/spasi', () => {
		expect(isSuperAdminEmail('martin.manullang@if.itera.ac.id', raw)).toBe(true);
		expect(isSuperAdminEmail('orang.lain@if.itera.ac.id', raw)).toBe(false);
		expect(isSuperAdminEmail('martin.manullang@if.itera.ac.id', undefined)).toBe(false);
	});

	it('admin di luar domain mahasiswa tetap boleh login', () => {
		expect(canSignIn('martin.manullang@if.itera.ac.id', true)).toBe(true);
		expect(canSignIn('dosen.lain@if.itera.ac.id', false)).toBe(false);
		expect(canSignIn('budi.122140001@student.itera.ac.id', false)).toBe(true);
	});

	it('memeriksa bentuk email undangan', () => {
		expect(isValidEmail(' Panitia.Baru@Gmail.com ')).toBe(true);
		expect(isValidEmail('tanpa-domain')).toBe(false);
		expect(isValidEmail('a@b')).toBe(false);
		expect(isValidEmail('a b@c.id')).toBe(false);
	});
});

describe('nimFromEmail', () => {
	it('mengambil NIM dari email mahasiswa', () => {
		expect(nimFromEmail('budi.122140001@student.itera.ac.id')).toBe('122140001');
		expect(nimFromEmail('Budi.Santoso.122140001@Student.ITERA.ac.id')).toBe('122140001');
		expect(nimFromEmail('122140001@student.itera.ac.id')).toBe('122140001');
	});

	it('menolak email tanpa NIM atau di luar domain mahasiswa', () => {
		expect(nimFromEmail('martin.manullang@if.itera.ac.id')).toBeNull();
		expect(nimFromEmail('budi.122140001@gmail.com')).toBeNull();
		expect(nimFromEmail('budi.122140001@student.itera.ac.id.evil.com')).toBeNull();
		expect(nimFromEmail('budi@student.itera.ac.id')).toBeNull();
		expect(nimFromEmail('budi122140001@student.itera.ac.id')).toBeNull();
		expect(nimFromEmail('budi.1221@student.itera.ac.id')).toBeNull();
	});
});
