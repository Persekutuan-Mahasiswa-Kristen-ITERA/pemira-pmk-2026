import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/auth.js';
import { PASS_COOKIE } from '#lib/server/tps.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		cookies.delete(PASS_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
