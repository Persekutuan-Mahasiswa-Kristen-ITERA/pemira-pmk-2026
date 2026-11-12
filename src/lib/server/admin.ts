import { error, redirect } from '@sveltejs/kit';
import type { AuthUser } from './auth';

/**
 * Pastikan pengguna adalah admin (super admin atau admin undangan). WAJIB dipanggil di
 * setiap `load` DAN setiap action di bawah /admin (pemeriksaan di layout tidak melindungi
 * action). Peran dihitung ulang dari database di setiap request (`hooks.server.ts`), jadi
 * admin yang dicabut langsung kehilangan akses.
 */
export function requireAdmin(locals: App.Locals): AuthUser {
	if (!locals.user) redirect(303, '/masuk');
	if (!locals.role) error(403, 'Halaman ini khusus panitia.');
	return locals.user;
}

/** Hanya super admin (dari secret `SUPER_ADMIN_EMAILS`), misalnya untuk mengundang admin. */
export function requireSuperAdmin(locals: App.Locals): AuthUser {
	const user = requireAdmin(locals);
	if (locals.role !== 'super') error(403, 'Halaman ini khusus super admin.');
	return user;
}

/** Boleh membuat kode TPS: Petugas TPS atau super admin. */
export function canMakeBoothCodes(locals: App.Locals): boolean {
	return locals.officer || locals.role === 'super';
}

/**
 * Hanya Petugas TPS (diundang super admin) atau super admin, untuk halaman /petugas.
 * Admin biasa tetap ditolak.
 */
export function requireOfficer(locals: App.Locals): AuthUser {
	if (!locals.user) redirect(303, '/masuk');
	if (!canMakeBoothCodes(locals)) error(403, 'Halaman ini khusus Petugas TPS.');
	return locals.user;
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
		voting_closed: 'Pemungutan suara sedang tidak dibuka.',
		'UNIQUE constraint failed: candidates.number': 'Nomor urut itu sudah dipakai calon lain.',
		'FOREIGN KEY': 'Data ini masih dipakai oleh data lain sehingga tidak bisa dihapus.',
		'CHECK constraint failed': 'Data tidak valid (misalnya waktu tutup harus setelah waktu buka).'
	};
	for (const [needle, text] of Object.entries(known)) {
		if (message.includes(needle)) return text;
	}
	return null;
}
