import { getApps, initializeApp } from 'firebase/app';
import {
	browserPopupRedirectResolver,
	GoogleAuthProvider,
	inMemoryPersistence,
	initializeAuth,
	signInWithPopup,
	signOut,
	type Auth
} from 'firebase/auth';
import { FIREBASE_CONFIG } from './firebase-config';

let auth: Auth | undefined;

function getFirebaseAuth(): Auth {
	if (!auth) {
		// Di production/staging, halaman login Firebase disajikan dari domain kita sendiri
		// (proxy `/__/auth/*` di src/lib/server/firebase-proxy.ts). Di localhost dipakai
		// domain bawaan Firebase.
		const authDomain =
			location.hostname === 'localhost' ? FIREBASE_CONFIG.authDomain : location.host;
		const app = getApps()[0] ?? initializeApp({ ...FIREBASE_CONFIG, authDomain });
		// Sesi tidak disimpan di browser: setelah login, token diserahkan ke server
		// (cookie httpOnly) dan sesi Firebase di browser langsung diakhiri.
		auth = initializeAuth(app, {
			persistence: inMemoryPersistence,
			popupRedirectResolver: browserPopupRedirectResolver
		});
	}
	return auth;
}

/**
 * Login Google lewat popup dan kembalikan Firebase ID token.
 * @param hostedDomain membatasi pilihan akun di layar Google (hanya petunjuk;
 *   pemeriksaan sebenarnya dilakukan di server).
 */
export async function signInWithGoogle(hostedDomain?: string): Promise<string> {
	const auth = getFirebaseAuth();
	const provider = new GoogleAuthProvider();
	provider.setCustomParameters({
		prompt: 'select_account',
		...(hostedDomain ? { hd: hostedDomain } : {})
	});
	const credential = await signInWithPopup(auth, provider);
	const idToken = await credential.user.getIdToken();
	await signOut(auth);
	return idToken;
}
