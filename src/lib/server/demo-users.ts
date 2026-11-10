/**
 * Pengguna untuk mode demo (`pnpm dev` → "Dummy local"). Hanya dipakai di server pengembangan
 * dengan data dummy (`scripts/seed-demo.sql`); tidak pernah aktif di build. Modul ini tidak
 * membaca `env` supaya bisa dites dengan SQLite biasa.
 */
import { isValidEmail, normalizeEmail, STUDENT_DOMAIN } from './access';

/** Super admin bawaan mode demo (ditambahkan ke `SUPER_ADMIN_EMAILS` hanya di mode demo). */
export const DEMO_SUPER_ADMIN = 'ketua.panitia@example.com';

/** Cookie sesi mode demo: berisi email yang sedang "dipakai". */
export const DEMO_COOKIE = 'pemira_demo_user';

export type DemoGroup = 'super' | 'admin' | 'officer' | 'voter' | 'outsider';

export interface DemoUser {
	email: string;
	label: string;
	group: DemoGroup;
}

export const DEMO_GROUP_LABEL: Record<DemoGroup, string> = {
	super: 'Super admin',
	admin: 'Admin',
	officer: 'Petugas TPS',
	voter: 'Pemilih (DPT)',
	outsider: 'Untuk mencoba penolakan'
};

/** Akun di luar DPT untuk memperlihatkan penolakan. */
const OUTSIDERS: DemoUser[] = [
	{
		email: `tamu.129999999@${STUDENT_DOMAIN}`,
		label: 'Mahasiswa ITERA, tidak terdaftar di DPT',
		group: 'outsider'
	},
	{ email: 'orang.luar@gmail.com', label: 'Akun Google di luar ITERA', group: 'outsider' }
];

/** Email mahasiswa berpola kampus: `namadepan.nim@student.itera.ac.id`. */
export function demoStudentEmail(name: string, nim: string): string {
	const first =
		name
			.normalize('NFKD')
			.toLowerCase()
			.split(/\s+/)[0]
			?.replace(/[^a-z]/g, '') || 'mahasiswa';
	return `${first}.${nim}@${STUDENT_DOMAIN}`;
}

/** Semua pengguna yang bisa dipilih di halaman masuk, dikelompokkan per peran. */
export async function listDemoUsers(db: D1Database): Promise<DemoUser[]> {
	const [admins, officers, voters] = await Promise.all([
		db.prepare('SELECT email FROM admins ORDER BY email').all<{ email: string }>(),
		db.prepare('SELECT email FROM officers ORDER BY email').all<{ email: string }>(),
		db.prepare('SELECT nim, name FROM voters ORDER BY name').all<{ nim: string; name: string }>()
	]);
	return [
		{ email: DEMO_SUPER_ADMIN, label: 'Ketua Panitia', group: 'super' },
		...admins.results.map((r) => ({ email: r.email, label: r.email, group: 'admin' as const })),
		...officers.results.map((r) => ({
			email: r.email,
			label: r.email,
			group: 'officer' as const
		})),
		...voters.results.map((r) => ({
			email: demoStudentEmail(r.name, r.nim),
			label: `${r.name} · ${r.nim}`,
			group: 'voter' as const
		})),
		...OUTSIDERS
	];
}

/** Email yang boleh dipakai untuk masuk di mode demo (format wajar saja). */
export function parseDemoEmail(raw: string): string | null {
	const email = normalizeEmail(raw);
	return isValidEmail(email) && email.length <= 254 ? email : null;
}
