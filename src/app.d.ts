// See https://svelte.dev/docs/kit/types#app.d.ts
// Binding Cloudflare (D1, secret) diakses lewat `import { env } from 'cloudflare:workers'`;
// tipenya ada di worker-configuration.d.ts (`pnpm gen`).
import type { AuthUser } from '#lib/server/auth.js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Pengguna yang login (token Firebase sudah diverifikasi), atau null. */
			user: AuthUser | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
