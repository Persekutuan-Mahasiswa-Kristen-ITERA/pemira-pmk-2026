import { fail } from '@sveltejs/kit';
import { isSuperAdminEmail, isValidEmail, normalizeEmail } from '#lib/server/access.js';
import { auditStatement, describeDbError, requireSuperAdmin } from '#lib/server/admin.js';
import { listAdmins, listOfficers } from '#lib/server/admins.js';
import { getDb } from '#lib/server/db.js';
import { superAdminEmails } from '#lib/server/demo.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireSuperAdmin(locals);
	const db = getDb();
	const [admins, officers] = await Promise.all([
		listAdmins(db, superAdminEmails()),
		listOfficers(db)
	]);
	return { admins, officers };
};

export const actions: Actions = {
	invite: async ({ locals, request }) => {
		const superAdmin = requireSuperAdmin(locals);
		const email = normalizeEmail(String((await request.formData()).get('email') ?? ''));

		if (!isValidEmail(email)) return fail(400, { error: 'Alamat email tidak valid.' });
		if (isSuperAdminEmail(email, superAdminEmails())) {
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
	},

	inviteOfficer: async ({ locals, request }) => {
		const superAdmin = requireSuperAdmin(locals);
		const email = normalizeEmail(String((await request.formData()).get('email') ?? ''));
		if (!isValidEmail(email)) return fail(400, { error: 'Alamat email tidak valid.' });

		const db = getDb();
		try {
			await db.batch([
				db
					.prepare('INSERT INTO officers (email, invited_by) VALUES (?, ?)')
					.bind(email, normalizeEmail(superAdmin.email)),
				auditStatement(db, superAdmin, 'officer.invite', { email })
			]);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes('UNIQUE') || message.includes('PRIMARY KEY')) {
				return fail(409, { error: `${email} sudah menjadi Petugas TPS.` });
			}
			return fail(409, { error: describeDbError(err) ?? 'Gagal mengundang petugas.' });
		}
		return { ok: `${email} sekarang Petugas TPS.`, invitedOfficer: email };
	},

	revokeOfficer: async ({ locals, request }) => {
		const superAdmin = requireSuperAdmin(locals);
		const email = normalizeEmail(String((await request.formData()).get('email') ?? ''));
		const db = getDb();
		const exists = await db
			.prepare('SELECT 1 AS ok FROM officers WHERE email = ?')
			.bind(email)
			.first<{ ok: number }>();
		if (!exists) return fail(404, { error: `${email} bukan Petugas TPS.` });

		await db.batch([
			db.prepare('DELETE FROM officers WHERE email = ?').bind(email),
			auditStatement(db, superAdmin, 'officer.revoke', { email })
		]);
		return { ok: `Akses Petugas TPS ${email} dicabut.` };
	}
};
