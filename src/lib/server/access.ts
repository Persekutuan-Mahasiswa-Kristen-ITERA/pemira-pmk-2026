export const STUDENT_DOMAIN = 'student.itera.ac.id';

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isStudentEmail(email: string): boolean {
	const parts = normalizeEmail(email).split('@');
	return parts.length === 2 && parts[0].length > 0 && parts[1] === STUDENT_DOMAIN;
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
