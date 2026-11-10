import { env } from 'cloudflare:workers';
import { dev } from '$app/env';
import type { LayoutServerLoad } from './$types';

/** Lingkungan yang sedang melayani situs, ditampilkan supaya tidak tertukar. */
export type AppEnv = 'production' | 'staging' | 'local';

export const load: LayoutServerLoad = ({ locals }) => ({
	userEmail: locals.user?.email ?? null,
	isAdmin: locals.role !== null,
	appEnv: appEnv(env.APP_ENV)
});

function appEnv(value: string | undefined): AppEnv {
	if (dev) return 'local';
	if (value === 'production' || value === 'staging') return value;
	// `pnpm preview` membaca APP_ENV=local dari .dev.vars; nilai tak dikenal juga dianggap bukan resmi.
	return 'local';
}
