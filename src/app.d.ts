// See https://svelte.dev/docs/kit/types#app.d.ts
// Binding Cloudflare (D1, secret) diakses lewat `import { env } from 'cloudflare:workers'`;
// tipenya ada di worker-configuration.d.ts (`pnpm gen`).
import type { AdminRole } from '#lib/server/admins.js';
import type { AuthUser } from '#lib/server/auth.js';

declare global {
	/** Commit git saat build (lihat vite.config.ts). */
	const __APP_COMMIT__: string;

	namespace App {
		// interface Error {}
		interface Locals {
			/** Pengguna yang login (token Firebase sudah diverifikasi), atau null. */
			user: AuthUser | null;
			/** Peran admin pengguna ini, atau null untuk pemilih biasa. */
			role: AdminRole | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
