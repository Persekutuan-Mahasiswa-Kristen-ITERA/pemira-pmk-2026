import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/auth.js';
import { DEMO_MODE } from '#lib/server/demo.js';
import { DEMO_COOKIE } from '#lib/server/demo-users.js';
import { PASS_COOKIE } from '#lib/server/tps.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		cookies.delete(PASS_COOKIE, { path: '/' });
		if (DEMO_MODE) {
			cookies.delete(DEMO_COOKIE, { path: '/' });
			redirect(303, '/masuk');
		}
		redirect(303, '/');
	}
};
