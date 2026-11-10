import { env } from 'cloudflare:workers';
import { fail } from '@sveltejs/kit';
import { isSuperAdminEmail, isValidEmail, normalizeEmail } from '#lib/server/access.js';
import { auditStatement, describeDbError, requireSuperAdmin } from '#lib/server/admin.js';
import { listAdmins } from '#lib/server/admins.js';
import { getDb } from '#lib/server/db.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireSuperAdmin(locals);
	return { admins: await listAdmins(getDb(), env.SUPER_ADMIN_EMAILS) };
};

export const actions: Actions = {
	invite: async ({ locals, request }) => {
		const superAdmin = requireSuperAdmin(locals);
		const email = normalizeEmail(String((await request.formData()).get('email') ?? ''));

		if (!isValidEmail(email)) return fail(400, { error: 'Alamat email tidak valid.' });
		if (isSuperAdminEmail(email, env.SUPER_ADMIN_EMAILS)) {
			return fail(400, { error: `${email} sudah super admin.` });
		}

		const db = getDb();
		try {
			await db.batch([
				db
					.prepare('INSERT INTO admins (email, invited_by) VALUES (?, ?)')
					.bind(email, normalizeEmail(superAdmin.email)),
				auditStatement(db, superAdmin, 'admin.invite', { email })
			]);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes('UNIQUE') || message.includes('PRIMARY KEY')) {
				return fail(409, { error: `${email} sudah menjadi admin.` });
			}
			return fail(409, { error: describeDbError(err) ?? 'Gagal mengundang admin.' });
		}
		return { ok: `${email} sekarang admin.`, invited: email };
	},

	revoke: async ({ locals, request }) => {
		const superAdmin = requireSuperAdmin(locals);
		const email = normalizeEmail(String((await request.formData()).get('email') ?? ''));

		const db = getDb();
		const exists = await db
			.prepare('SELECT 1 AS ok FROM admins WHERE email = ?')
			.bind(email)
			.first<{ ok: number }>();
		if (!exists) return fail(404, { error: `${email} bukan admin undangan.` });

		await db.batch([
			db.prepare('DELETE FROM admins WHERE email = ?').bind(email),
			auditStatement(db, superAdmin, 'admin.revoke', { email })
		]);
		return { ok: `Akses admin ${email} dicabut.` };
	}
};
