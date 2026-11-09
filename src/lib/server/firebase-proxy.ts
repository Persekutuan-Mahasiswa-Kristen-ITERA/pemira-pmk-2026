import { FIREBASE_CONFIG } from '#lib/firebase-config.js';

/**
 * Proxy halaman login Firebase (`/__/auth/*`) lewat domain kita sendiri.
 *
 * Browser modern memisahkan penyimpanan antar-situs, sehingga login lewat
 * `<project>.firebaseapp.com` bisa gagal ("missing initial state"). Dengan proxy
 * ini, `authDomain` di browser = domain situs kita, sesuai rekomendasi Firebase:
 * https://firebase.google.com/docs/auth/web/redirect-best-practices#proxy-requests
 */
const PROXY_PREFIXES = ['/__/auth/', '/__/firebase/'];
const FORWARDED_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type', 'user-agent'];

export function isFirebaseProxyPath(pathname: string): boolean {
	return PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxyFirebaseAuth(request: Request, url: URL): Promise<Response> {
	const target = new URL(url.pathname + url.search, `https://${FIREBASE_CONFIG.authDomain}`);

	// Hanya header yang diperlukan; cookie sesi kita TIDAK diteruskan ke Google.
	const headers = new Headers();
	for (const name of FORWARDED_REQUEST_HEADERS) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}

	const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
	const upstream = await fetch(target, {
		method: request.method,
		headers,
		body: hasBody ? await request.arrayBuffer() : undefined,
		redirect: 'manual'
	});

	const responseHeaders = new Headers(upstream.headers);
	responseHeaders.delete('set-cookie');
	return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
