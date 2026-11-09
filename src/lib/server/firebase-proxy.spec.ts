import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFirebaseProxyPath, proxyFirebaseAuth } from './firebase-proxy';

afterEach(() => vi.unstubAllGlobals());

describe('isFirebaseProxyPath', () => {
	it('hanya untuk jalur login Firebase', () => {
		expect(isFirebaseProxyPath('/__/auth/handler')).toBe(true);
		expect(isFirebaseProxyPath('/__/auth/iframe.js')).toBe(true);
		expect(isFirebaseProxyPath('/__/firebase/init.json')).toBe(true);
		expect(isFirebaseProxyPath('/pilih')).toBe(false);
		expect(isFirebaseProxyPath('/__/lain')).toBe(false);
		expect(isFirebaseProxyPath('/x/__/auth/handler')).toBe(false);
	});
});

describe('proxyFirebaseAuth', () => {
	it('meneruskan ke firebaseapp.com tanpa cookie sesi', async () => {
		const fetchMock = vi.fn(async () => new Response('ok', { headers: { 'set-cookie': 'x=1' } }));
		vi.stubGlobal('fetch', fetchMock);

		const url = new URL('https://pemira.example/__/auth/handler?apiKey=k&x=1');
		const request = new Request(url, {
			headers: { cookie: 'pemira_session=rahasia', 'accept-language': 'id' }
		});
		const response = await proxyFirebaseAuth(request, url);

		const [target, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
		expect(target.toString()).toBe(
			'https://pemira-pmk-itera.firebaseapp.com/__/auth/handler?apiKey=k&x=1'
		);
		const sent = init.headers as Headers;
		expect(sent.get('cookie')).toBeNull();
		expect(sent.get('accept-language')).toBe('id');
		expect(response.headers.get('set-cookie')).toBeNull();
		expect(await response.text()).toBe('ok');
	});
});
