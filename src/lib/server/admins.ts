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
	return (await getStaffRoles(db, email, superAdminEmailsRaw)).role;
}

export interface StaffRoles {
	/** Peran admin, atau null. */
	role: AdminRole | null;
	/** Petugas TPS (hanya bisa membuat kode TPS). */
	officer: boolean;
}

/** Peran admin dan status Petugas TPS dalam satu query. */
export async function getStaffRoles(
	db: D1Database,
	email: string,
	superAdminEmailsRaw: string | undefined
): Promise<StaffRoles> {
	const normalized = normalizeEmail(email);
	const row = await db
		.prepare(
			`SELECT EXISTS (SELECT 1 FROM admins WHERE email = ?1) AS admin,
			        EXISTS (SELECT 1 FROM officers WHERE email = ?1) AS officer`
		)
		.bind(normalized)
		.first<{ admin: number; officer: number }>();
	const role: AdminRole | null = isSuperAdminEmail(email, superAdminEmailsRaw)
		? 'super'
		: row?.admin
			? 'admin'
			: null;
	return { role, officer: Boolean(row?.officer) };
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

/** Catat waktu masuk terakhir Petugas TPS. */
export function recordOfficerLogin(db: D1Database, email: string): D1PreparedStatement {
	return db
		.prepare('UPDATE officers SET last_login_at = unixepoch() WHERE email = ?')
		.bind(normalizeEmail(email));
}

export interface OfficerRow {
	email: string;
	invitedBy: string;
	invitedAt: number;
	lastLoginAt: number | null;
}

export async function listOfficers(db: D1Database): Promise<OfficerRow[]> {
	const { results } = await db
		.prepare(
			'SELECT email, invited_by, invited_at, last_login_at FROM officers ORDER BY invited_at, email'
		)
		.all<{ email: string; invited_by: string; invited_at: number; last_login_at: number | null }>();
	return results.map((r) => ({
		email: r.email,
		invitedBy: r.invited_by,
		invitedAt: r.invited_at,
		lastLoginAt: r.last_login_at
	}));
}
