import { error, fail, redirect } from '@sveltejs/kit';
import { canSignIn, STUDENT_DOMAIN } from '#lib/server/access.js';
import { getStaffRoles, recordAdminLogin, recordOfficerLogin } from '#lib/server/admins.js';
import { SESSION_COOKIE, verifyIdToken } from '#lib/server/auth.js';
import { getDb } from '#lib/server/db.js';
import { DEMO_MODE, superAdminEmails } from '#lib/server/demo.js';
import {
	DEMO_COOKIE,
	DEMO_GROUP_LABEL,
	listDemoUsers,
	parseDemoEmail
} from '#lib/server/demo-users.js';
import {
	PASS_COOKIE,
	passCookieOptions,
	redeemExceptionCode,
	type RedeemFailure
} from '#lib/server/tps.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user || locals.pass?.via === 'exception') redirect(303, '/pilih');
	return {
		studentDomain: STUDENT_DOMAIN,
		/** Mode demo saja: daftar pengguna dummy untuk login impersonate. */
		demoUsers: DEMO_MODE ? await listDemoUsers(getDb()) : null,
		demoGroupLabels: DEMO_GROUP_LABEL
	};
};

const CODE_FAILURES: Record<RedeemFailure, string> = {
	invalid_code:
		'Kode tidak berlaku: salah ketik, sudah dipakai, atau sudah lewat 5 menit. Minta panitia membuat kode baru.',
	not_eligible: 'NIM untuk kode ini tidak ada di DPT.',
	already_voted: 'NIM untuk kode ini sudah memberikan suara.'
};

export const actions: Actions = {
	google: async ({ request, cookies }) => {
		const idToken = String((await request.formData()).get('idToken') ?? '');

		let user;
		try {
			user = await verifyIdToken(idToken);
		} catch {
			return fail(401, { error: 'Login tidak dapat diverifikasi. Silakan coba lagi.' });
		}

		const db = getDb();
		const { role, officer } = await getStaffRoles(db, user.email, superAdminEmails());
		if (!canSignIn(user.email, role !== null || officer)) {
			return fail(403, {
				error: `Akun ${user.email} tidak bisa dipakai. Gunakan email @${STUDENT_DOMAIN}.`
			});
		}

		const maxAge = user.expiresAt - Math.floor(Date.now() / 1000);
		cookies.set(SESSION_COOKIE, idToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge
		});
		if (role === 'admin') await recordAdminLogin(db, user.email).run();
		if (officer) await recordOfficerLogin(db, user.email).run();
		return { target: role !== null ? 'admin' : officer ? 'officer' : 'voter' };
	},

	/** Mode demo saja (`pnpm dev` → "Dummy local"): masuk sebagai pengguna dummy tanpa Google. */
	impersonate: async ({ request, cookies }) => {
		if (!DEMO_MODE) error(404, 'Not found');
		const email = parseDemoEmail(String((await request.formData()).get('email') ?? ''));
		if (!email) return fail(400, { demoError: 'Pilih atau ketik email yang valid.' });

		const db = getDb();
		const { role, officer } = await getStaffRoles(db, email, superAdminEmails());
		if (!canSignIn(email, role !== null || officer)) {
			return fail(403, {
				demoError: `Akun ${email} tidak bisa dipakai. Gunakan email @${STUDENT_DOMAIN}.`
			});
		}

		cookies.delete(SESSION_COOKIE, { path: '/' });
		cookies.delete(PASS_COOKIE, { path: '/' });
		cookies.set(DEMO_COOKIE, email, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 3600 });
		if (role === 'admin') await recordAdminLogin(db, email).run();
		if (officer) await recordOfficerLogin(db, email).run();
		redirect(303, role !== null ? '/admin' : officer ? '/petugas' : '/pilih');
	},

	/** Jalur pengecualian: masuk dengan kode dari dua admin, tanpa login Google. */
	code: async ({ request, cookies }) => {
		const code = String((await request.formData()).get('code') ?? '');
		if (!code.trim()) return fail(400, { codeError: 'Masukkan kode dari panitia.' });

		const result = await redeemExceptionCode(getDb(), code);
		if (!result.ok) return fail(403, { codeError: CODE_FAILURES[result.reason] });

		cookies.set(PASS_COOKIE, result.token, passCookieOptions(result.expiresAt));
		redirect(303, '/pilih');
	}
};
