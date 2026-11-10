import { env } from 'cloudflare:workers';
import { fail, redirect } from '@sveltejs/kit';
import { canSignIn, isAdminEmail, STUDENT_DOMAIN } from '#lib/server/access.js';
import { SESSION_COOKIE, verifyIdToken } from '#lib/server/auth.js';
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

		if (!canSignIn(user.email, env.ADMIN_EMAILS)) {
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
		return { admin: isAdminEmail(user.email, env.ADMIN_EMAILS) };
	}
};
