import { env } from 'cloudflare:workers';
import { fail, redirect } from '@sveltejs/kit';
import { canSignIn, STUDENT_DOMAIN } from '#lib/server/access.js';
import { getAdminRole, recordAdminLogin } from '#lib/server/admins.js';
import { SESSION_COOKIE, verifyIdToken } from '#lib/server/auth.js';
import { getDb } from '#lib/server/db.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/pilih');
	return { studentDomain: STUDENT_DOMAIN };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const idToken = String((await request.formData()).get('idToken') ?? '');

		let user;
		try {
			user = await verifyIdToken(idToken);
		} catch {
			return fail(401, { error: 'Login tidak dapat diverifikasi. Silakan coba lagi.' });
		}

		const db = getDb();
		const role = await getAdminRole(db, user.email, env.SUPER_ADMIN_EMAILS);
		if (!canSignIn(user.email, role !== null)) {
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
		return { admin: role !== null };
	}
};
