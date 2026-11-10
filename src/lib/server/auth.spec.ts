import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { verifyIdToken } from './auth';

const PROJECT = 'pemira-test';
const KID = 'kunci-tes';

let privateKey: CryptoKey;
let otherKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
	const pair = await generateKeyPair('RS256');
	privateKey = pair.privateKey;
	otherKey = (await generateKeyPair('RS256')).privateKey;
	const jwk = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: 'RS256' };
	keys = createLocalJWKSet({ keys: [jwk] });
});

const now = () => Math.floor(Date.now() / 1000);

function token(claims: Record<string, unknown> = {}, opts: { key?: CryptoKey; exp?: number } = {}) {
	return new SignJWT({
		email: 'budi.122140001@student.itera.ac.id',
		email_verified: true,
		name: 'Budi',
		auth_time: now() - 10,
		firebase: { sign_in_provider: 'google.com' },
		...claims
	})
		.setProtectedHeader({ alg: 'RS256', kid: KID })
		.setIssuer(`https://securetoken.google.com/${PROJECT}`)
		.setAudience(PROJECT)
		.setSubject('uid-123')
		.setIssuedAt()
		.setExpirationTime(opts.exp ?? now() + 3600)
		.sign(opts.key ?? privateKey);
}

const verify = (t: string) => verifyIdToken(t, { projectId: PROJECT, keys });

describe('verifyIdToken', () => {
	it('menerima token Google yang sah', async () => {
		const user = await verify(await token({ email: 'Budi.122140001@Student.Itera.ac.id' }));
		expect(user.email).toBe('budi.122140001@student.itera.ac.id');
		expect(user.name).toBe('Budi');
		expect(user.expiresAt).toBeGreaterThan(now());
	});

	it('menolak token yang ditandatangani kunci lain', async () => {
		await expect(verify(await token({}, { key: otherKey }))).rejects.toThrow();
	});

	it('menolak token kedaluwarsa', async () => {
		await expect(verify(await token({}, { exp: now() - 120 }))).rejects.toThrow();
	});

	it('menolak token untuk proyek Firebase lain', async () => {
		await expect(
			verifyIdToken(await token(), { projectId: 'proyek-lain', keys })
		).rejects.toThrow();
	});

	it('menolak email yang belum terverifikasi', async () => {
		await expect(verify(await token({ email_verified: false }))).rejects.toThrow(
			'unverified_email'
		);
	});

	it('menolak login selain Google', async () => {
		await expect(
			verify(await token({ firebase: { sign_in_provider: 'password' } }))
		).rejects.toThrow('invalid_provider');
	});

	it('menolak token tanpa email', async () => {
		await expect(verify(await token({ email: undefined }))).rejects.toThrow('unverified_email');
	});

	it('menolak token kosong, rusak, atau tanpa tanda tangan', async () => {
		await expect(verify('')).rejects.toThrow();
		await expect(verify('bukan.sebuah.token')).rejects.toThrow();
		const unsigned =
			btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, '') +
			'.' +
			btoa(JSON.stringify({ sub: 'x' })).replace(/=+$/, '') +
			'.';
		await expect(verify(unsigned)).rejects.toThrow();
	});
});
