import { requireAdmin } from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const { results } = await getDb()
		.prepare('SELECT id, at, actor_email, action, detail FROM audit_log ORDER BY id DESC LIMIT 500')
		.all<{ id: number; at: number; actor_email: string; action: string; detail: string | null }>();
	return { entries: results };
};
