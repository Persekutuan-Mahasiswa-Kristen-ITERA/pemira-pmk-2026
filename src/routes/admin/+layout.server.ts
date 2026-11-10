import { requireAdmin } from '#lib/server/admin.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const admin = requireAdmin(locals.user);
	return { adminEmail: admin.email };
};
