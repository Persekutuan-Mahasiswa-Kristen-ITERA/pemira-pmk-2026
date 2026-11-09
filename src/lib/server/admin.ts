import { env } from 'cloudflare:workers';
import { error, redirect } from '@sveltejs/kit';
import { isAdminEmail } from './access';
import type { AuthUser } from './auth';

/**
 * Pastikan pengguna adalah admin. WAJIB dipanggil di setiap `load` DAN setiap
 * action di bawah /admin (pemeriksaan di layout tidak melindungi action).
 */
export function requireAdmin(user: AuthUser | null): AuthUser {
	if (!user) redirect(303, '/masuk');
	if (!isAdminEmail(user.email, env.ADMIN_EMAILS)) error(403, 'Halaman ini khusus panitia.');
	return user;
}

/** Statement audit log, untuk dimasukkan ke batch yang sama dengan aksinya. */
export function auditStatement(
	db: D1Database,
	actor: AuthUser,
	action: string,
	detail: Record<string, unknown> = {}
): D1PreparedStatement {
	return db
		.prepare('INSERT INTO audit_log (actor_email, action, detail) VALUES (?, ?, ?)')
		.bind(actor.email, action, JSON.stringify(detail));
}

/** Terjemahkan penolakan trigger database menjadi pesan untuk admin. */
export function describeDbError(err: unknown): string | null {
	const message = err instanceof Error ? err.message : String(err);
	const known: Record<string, string> = {
		schedule_locked:
			'Jadwal tidak bisa diubah: pemilihan sudah dibuka. Yang masih bisa dilakukan hanya tutup darurat.',
		candidates_locked: 'Daftar calon terkunci karena pemilihan sudah dibuka.',
		voters_locked: 'DPT terkunci karena pemilihan sudah dibuka.',
		'UNIQUE constraint failed: candidates.number': 'Nomor urut itu sudah dipakai calon lain.',
		'FOREIGN KEY': 'Data ini masih dipakai oleh data lain sehingga tidak bisa dihapus.',
		'CHECK constraint failed': 'Data tidak valid (misalnya waktu tutup harus setelah waktu buka).'
	};
	for (const [needle, text] of Object.entries(known)) {
		if (message.includes(needle)) return text;
	}
	return null;
}
