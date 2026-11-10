export const STUDENT_DOMAIN = 'student.itera.ac.id';

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isStudentEmail(email: string): boolean {
	const parts = normalizeEmail(email).split('@');
	return parts.length === 2 && parts[0].length > 0 && parts[1] === STUDENT_DOMAIN;
}

const NIM_IN_STUDENT_EMAIL = /^(?:[^@]*\.)?(\d{8,12})@student\.itera\.ac\.id$/;

/**
 * Ambil NIM dari email mahasiswa (`nama.nim@student.itera.ac.id`). Email dibuat oleh
 * kampus dan diverifikasi Google, jadi NIM di dalamnya menjadi identitas pemilih.
 * Mengembalikan `null` untuk email yang bukan email mahasiswa atau tanpa NIM.
 */
export function nimFromEmail(email: string): string | null {
	return NIM_IN_STUDENT_EMAIL.exec(normalizeEmail(email))?.[1] ?? null;
}

/** NIM ITERA: hanya angka, 8–12 digit (saat ini 9). Sama dengan CHECK di tabel `voters`. */
export function isValidNim(nim: string): boolean {
	return /^\d{8,12}$/.test(nim);
}

/** `ADMIN_EMAILS` berisi daftar email dipisah koma (secret Cloudflare). */
export function parseAdminEmails(raw: string | undefined): Set<string> {
	return new Set(
		(raw ?? '')
			.split(',')
			.map(normalizeEmail)
			.filter((e) => e.includes('@'))
	);
}

export function isAdminEmail(email: string, adminEmailsRaw: string | undefined): boolean {
	return parseAdminEmails(adminEmailsRaw).has(normalizeEmail(email));
}

/** Siapa yang boleh login: mahasiswa ITERA (hak pilih dicek terpisah ke DPT) atau admin. */
export function canSignIn(email: string, adminEmailsRaw: string | undefined): boolean {
	return isStudentEmail(email) || isAdminEmail(email, adminEmailsRaw);
}
