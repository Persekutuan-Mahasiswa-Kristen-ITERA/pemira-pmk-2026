/**
 * Peran admin. Super admin berasal dari secret `SUPER_ADMIN_EMAILS`; admin biasa adalah
 * email yang diundang super admin (tabel `admins`). Modul ini tidak membaca `env` supaya
 * bisa dites dengan SQLite biasa.
 */
import { isSuperAdminEmail, normalizeEmail, parseEmailList } from './access';

export type AdminRole = 'super' | 'admin';

export async function getAdminRole(
	db: D1Database,
	email: string,
	superAdminEmailsRaw: string | undefined
): Promise<AdminRole | null> {
	if (isSuperAdminEmail(email, superAdminEmailsRaw)) return 'super';
	const row = await db
		.prepare('SELECT 1 AS ok FROM admins WHERE email = ?')
		.bind(normalizeEmail(email))
		.first<{ ok: number }>();
	return row ? 'admin' : null;
}

/** Catat waktu masuk terakhir admin undangan (untuk status di halaman Panitia). */
export function recordAdminLogin(db: D1Database, email: string): D1PreparedStatement {
	return db
		.prepare('UPDATE admins SET last_login_at = unixepoch() WHERE email = ?')
		.bind(normalizeEmail(email));
}

export interface AdminRow {
	email: string;
	role: AdminRole;
	invitedBy: string | null;
	invitedAt: number | null;
	lastLoginAt: number | null;
}

/** Semua admin: super admin dulu (dari secret), lalu admin undangan urut waktu undangan. */
export async function listAdmins(
	db: D1Database,
	superAdminEmailsRaw: string | undefined
): Promise<AdminRow[]> {
	const supers = [...parseEmailList(superAdminEmailsRaw)].map((email): AdminRow => ({
		email,
		role: 'super',
		invitedBy: null,
		invitedAt: null,
		lastLoginAt: null
	}));
	const { results } = await db
		.prepare(
			'SELECT email, invited_by, invited_at, last_login_at FROM admins ORDER BY invited_at, email'
		)
		.all<{ email: string; invited_by: string; invited_at: number; last_login_at: number | null }>();
	return [
		...supers,
		...results.map((r): AdminRow => ({
			email: r.email,
			role: 'admin',
			invitedBy: r.invited_by,
			invitedAt: r.invited_at,
			lastLoginAt: r.last_login_at
		}))
	];
}
