import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, verifyIdToken } from '#lib/server/auth.js';
import { isFirebaseProxyPath, proxyFirebaseAuth } from '#lib/server/firebase-proxy.js';

export const handle: Handle = async ({ event, resolve }) => {
	if (isFirebaseProxyPath(event.url.pathname)) {
		return proxyFirebaseAuth(event.request, event.url);
	}

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
	response.headers.set(
		'permissions-policy',
		'camera=(), microphone=(), geolocation=(), payment=()'
	);
	if (event.url.protocol === 'https:') {
		response.headers.set('strict-transport-security', 'max-age=31536000');
	}
	if (event.locals.user) {
		// Halaman pribadi (termasuk kode tanda terima) tidak boleh disimpan cache.
		response.headers.set('cache-control', 'private, no-store');
	}
	return response;
};
