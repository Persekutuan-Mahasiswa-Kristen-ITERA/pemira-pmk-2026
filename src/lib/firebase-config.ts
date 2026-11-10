/**
 * Konfigurasi web Firebase. Nilai-nilai ini BUKAN rahasia: memang dikirim ke browser
 * setiap pengunjung. Keamanan login dijaga di server, yang memverifikasi token Firebase
 * (src/lib/server/auth.ts) lalu mencocokkan email dengan DPT.
 */
export const FIREBASE_CONFIG = {
	apiKey: 'AIzaSyCmDQN7qhDqf5Cg-6S3D9k0K_BX2XXf9Y4',
	authDomain: 'pemira-pmk-itera.firebaseapp.com',
	projectId: 'pemira-pmk-itera',
	storageBucket: 'pemira-pmk-itera.firebasestorage.app',
	messagingSenderId: '801347194659',
	appId: '1:801347194659:web:39f1517a7a8ea2d6be0696'
} as const;

export const FIREBASE_PROJECT_ID = FIREBASE_CONFIG.projectId;
