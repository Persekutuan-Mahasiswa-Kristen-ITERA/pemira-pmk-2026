import type { ElectionStatus } from './election';

/**
 * Cache di memori isolate untuk data yang TIDAK BISA berubah lagi setelah pemungutan suara ditutup:
 * jumlah DPT, `voted`, dan `ballots` (dikunci trigger `voters_lock_*`, `voted_*`, `ballots_*`).
 *
 * Alasannya kuota baca D1: `count(*) FROM voters` saja membaca seluruh DPT (±4.500 baris) setiap
 * kunjungan beranda dan halaman Hasil. Pada 23 November 2026 malam, setelah hasil diumumkan, kuota harian
 * gratis (5 juta baris) habis dan situs mati sampai kuota direset. Dengan cache ini, setiap isolate
 * membaca data hasil paling banyak sekali per `TTL_MS`.
 *
 * Aturan:
 * - Hanya dipakai pada fase `closed` (menurut jam D1). Selama dibuka, angka partisipasi tetap dibaca
 *   langsung supaya selalu terbaru.
 * - Kunci cache memuat `closesAt`, jadi jadwal baru (mis. setelah `reset-uji-coba`) tidak pernah memakai
 *   nilai lama.
 * - `TTL_MS` membatasi umur nilai bila database diubah di luar aplikasi (akses langsung D1).
 * - Yang disimpan hanya data mentah. Gerbang tampil (`resultsVisible`, `isAuditPublic`, `showsCounts`)
 *   tetap dibaca dan dicek di setiap request.
 * - Yang disimpan adalah nilai yang sudah selesai, bukan Promise: Workers melarang memakai I/O milik
 *   request lain.
 */
export const TTL_MS = 60 * 60 * 1000;

type Election = Pick<ElectionStatus, 'phase' | 'closesAt'>;
interface Entry {
	closesAt: number;
	expiresAt: number;
	value: unknown;
}

const store = new Map<string, Entry>();

export async function cachedWhenClosed<T>(
	key: string,
	election: Election,
	load: () => Promise<T>,
	now: () => number = Date.now
): Promise<T> {
	if (election.phase !== 'closed' || election.closesAt === null) return load();
	const closesAt = election.closesAt;
	const hit = store.get(key);
	if (hit && hit.closesAt === closesAt && hit.expiresAt > now()) return hit.value as T;
	// Kegagalan tidak disimpan: `load()` yang melempar error langsung diteruskan.
	const value = await load();
	store.set(key, { closesAt, expiresAt: now() + TTL_MS, value });
	return value;
}

/** Untuk tes. */
export function clearClosedCache(): void {
	store.clear();
}
