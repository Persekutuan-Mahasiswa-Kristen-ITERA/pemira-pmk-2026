import { env } from 'cloudflare:workers';

/** Binding D1 (lihat `d1_databases` di wrangler.jsonc). */
export function getDb(): D1Database {
	return env.DB;
}
