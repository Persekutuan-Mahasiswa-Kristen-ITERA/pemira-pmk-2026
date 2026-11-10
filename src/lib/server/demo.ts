/**
 * Saklar mode demo. `dev` bernilai false saat build dan `__DEV_MODE__` selalu 'local' saat build
 * (vite.config.ts), jadi login impersonate tidak pernah ada di staging/production.
 */
import { env } from 'cloudflare:workers';
import { dev } from '$app/env';
import { DEMO_SUPER_ADMIN } from './demo-users';

export const DEMO_MODE: boolean = dev && __DEV_MODE__ === 'demo';

/** Daftar super admin: secret `SUPER_ADMIN_EMAILS`, ditambah super admin demo di mode demo. */
export function superAdminEmails(): string | undefined {
	if (!DEMO_MODE) return env.SUPER_ADMIN_EMAILS;
	return [env.SUPER_ADMIN_EMAILS, DEMO_SUPER_ADMIN].filter(Boolean).join(',');
}
