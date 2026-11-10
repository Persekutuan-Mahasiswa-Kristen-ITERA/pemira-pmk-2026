import { requireAdmin } from '#lib/server/admin.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const admin = requireAdmin(locals);
	return { adminEmail: admin.email, isSuperAdmin: locals.role === 'super' };
};
