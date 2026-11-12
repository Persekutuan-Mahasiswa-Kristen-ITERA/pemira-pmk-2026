import { env } from 'cloudflare:workers';
import { dev } from '$app/env';
import { DEMO_MODE } from '#lib/server/demo.js';
import { getDb } from '#lib/server/db.js';
import { isPublicTest } from '#lib/server/election.js';
import type { LayoutServerLoad } from './$types';

/** Lingkungan yang sedang melayani situs, ditampilkan supaya tidak tertukar. */
export type AppEnv = 'production' | 'staging' | 'local';

export const load: LayoutServerLoad = async ({ locals }) => ({
	// Pemilih jalur kode pengecualian tidak punya email; tampilkan NIM-nya.
	userEmail:
		locals.user?.email ?? (locals.pass?.via === 'exception' ? `NIM ${locals.pass.nim}` : null),
	isAdmin: locals.role !== null,
	isOfficer: locals.officer,
	appEnv: appEnv(env.APP_ENV),
	/** Uji coba publik di database ini: pita tampil sampai `scripts/reset-uji-coba.sql` dijalankan. */
	publicTest: await isPublicTest(getDb()),
	/** Mode demo `pnpm dev`: data dummy lokal + login impersonate. */
	demo: DEMO_MODE
});

function appEnv(value: string | undefined): AppEnv {
	// `pnpm dev` mode "live remote" memakai database staging.
	if (dev) return __DEV_MODE__ === 'staging' ? 'staging' : 'local';
	if (value === 'production' || value === 'staging') return value;
	// `pnpm preview` membaca APP_ENV=local dari .dev.vars; nilai tak dikenal juga dianggap bukan resmi.
	return 'local';
}
