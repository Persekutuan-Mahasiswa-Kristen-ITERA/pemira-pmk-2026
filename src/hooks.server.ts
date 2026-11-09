import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, verifyIdToken } from '#lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		try {
			event.locals.user = await verifyIdToken(token);
		} catch {
			// Token kedaluwarsa atau tidak sah: akhiri sesi.
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	const response = await resolve(event);

	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'same-origin');
	if (event.locals.user) {
		// Halaman pribadi (termasuk kode tanda terima) tidak boleh disimpan cache.
		response.headers.set('cache-control', 'private, no-store');
	}
	return response;
};
