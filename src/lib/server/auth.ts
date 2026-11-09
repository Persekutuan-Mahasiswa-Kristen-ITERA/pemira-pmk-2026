import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { FIREBASE_PROJECT_ID } from '#lib/firebase-config.js';
import { normalizeEmail } from './access';

/** Nama cookie sesi. Isinya Firebase ID token (berlaku maks. 1 jam), httpOnly. */
export const SESSION_COOKIE = 'pemira_session';

/** Kunci publik Google untuk menandatangani Firebase ID token. */
const FIREBASE_JWKS_URL = new URL(
	'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
);

let remoteKeys: JWTVerifyGetKey | undefined;

export interface AuthUser {
	email: string;
	name: string | null;
	/** Detik Unix saat token kedaluwarsa. */
	expiresAt: number;
}

export interface VerifyOptions {
	projectId?: string;
	/** Untuk tes: kunci lokal sebagai pengganti kunci Google. */
	keys?: JWTVerifyGetKey;
}

/**
 * Verifikasi Firebase ID token sesuai
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 *
 * Melempar error jika token tidak sah. Hanya login lewat Google dengan email
 * terverifikasi yang diterima.
 */
export async function verifyIdToken(token: string, options: VerifyOptions = {}): Promise<AuthUser> {
	if (!token || token.length > 4096) throw new Error('invalid_token');

	const projectId = options.projectId ?? FIREBASE_PROJECT_ID;
	const keys = options.keys ?? (remoteKeys ??= createRemoteJWKSet(FIREBASE_JWKS_URL));

	const { payload } = await jwtVerify(token, keys, {
		algorithms: ['RS256'],
		issuer: `https://securetoken.google.com/${projectId}`,
		audience: projectId,
		requiredClaims: ['sub', 'iat', 'exp', 'auth_time']
	});

	const now = Math.floor(Date.now() / 1000);
	const firebase = payload.firebase as { sign_in_provider?: unknown } | undefined;

	if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('invalid_sub');
	if (typeof payload.auth_time !== 'number' || payload.auth_time > now + 60) {
		throw new Error('invalid_auth_time');
	}
	if (firebase?.sign_in_provider !== 'google.com') throw new Error('invalid_provider');
	if (typeof payload.email !== 'string' || payload.email_verified !== true) {
		throw new Error('unverified_email');
	}

	return {
		email: normalizeEmail(payload.email),
		name: typeof payload.name === 'string' ? payload.name : null,
		expiresAt: payload.exp as number
	};
}
