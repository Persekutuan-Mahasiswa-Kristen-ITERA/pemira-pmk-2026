/**
 * Dasar opsi cookie: `secure` hanya di https. SvelteKit secara bawaan menganggap semua host selain
 * `localhost` sebagai https, sehingga server pengembangan yang dibuka dari perangkat lain lewat IP
 * jaringan (http://192.168.x.x) tidak bisa menyimpan atau menghapus cookie. Situs resmi selalu https,
 * jadi di sana cookie tetap `secure`.
 */
export function cookieBase(url: URL) {
	return { path: '/', secure: url.protocol === 'https:' };
}
