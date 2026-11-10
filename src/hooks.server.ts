import type { Handle } from '@sveltejs/kit/hooks';
import { getStaffRoles } from '#lib/server/admins.js';
import { SESSION_COOKIE, verifyIdToken } from '#lib/server/auth.js';
import { cookieBase } from '#lib/server/cookies.js';
import { getDb } from '#lib/server/db.js';
import { DEMO_MODE, superAdminEmails } from '#lib/server/demo.js';
import { DEMO_COOKIE } from '#lib/server/demo-users.js';
import { isFirebaseProxyPath, proxyFirebaseAuth } from '#lib/server/firebase-proxy.js';
import { getPass, PASS_COOKIE } from '#lib/server/tps.js';

export const handle: Handle = async ({ event, resolve }) => {
	if (isFirebaseProxyPath(event.url.pathname)) {
		return proxyFirebaseAuth(event.request, event.url);
	}

	event.locals.user = null;
	event.locals.role = null;
	event.locals.officer = false;
	event.locals.pass = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		try {
			event.locals.user = await verifyIdToken(token);
		} catch {
			// Token kedaluwarsa atau tidak sah: akhiri sesi.
			event.cookies.delete(SESSION_COOKIE, cookieBase(event.url));
		}
	}
	if (!event.locals.user && DEMO_MODE) {
		// Mode demo (hanya `pnpm dev` → "Dummy local"): login impersonate tanpa Google.
		const email = event.cookies.get(DEMO_COOKIE);
		if (email) {
			event.locals.user = { email, name: null, expiresAt: Math.floor(Date.now() / 1000) + 3600 };
		}
	}
	if (event.locals.user) {
		// Peran dihitung ulang setiap request: admin yang dicabut langsung kehilangan akses.
		const roles = await getStaffRoles(getDb(), event.locals.user.email, superAdminEmails());
		event.locals.role = roles.role;
		event.locals.officer = roles.officer;
	}

	const passToken = event.cookies.get(PASS_COOKIE);
	if (passToken) {
		event.locals.pass = await getPass(getDb(), passToken);
		// Izin kedaluwarsa atau sudah terpakai: hapus cookie-nya.
		if (!event.locals.pass) event.cookies.delete(PASS_COOKIE, cookieBase(event.url));
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
	if (event.locals.user || event.locals.pass) {
		// Halaman pribadi (termasuk kode tanda terima) tidak boleh disimpan cache.
		response.headers.set('cache-control', 'private, no-store');
	}
	return response;
};
