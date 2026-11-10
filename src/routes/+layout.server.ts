import { env } from 'cloudflare:workers';
import { isAdminEmail } from '#lib/server/access.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	userEmail: locals.user?.email ?? null,
	isAdmin: locals.user ? isAdminEmail(locals.user.email, env.ADMIN_EMAILS) : false
});
