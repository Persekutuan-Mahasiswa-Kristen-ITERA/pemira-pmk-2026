export type ElectionPhase = 'unscheduled' | 'upcoming' | 'open' | 'closed';

export interface ElectionConfig {
	title: string;
	opensAt: number | null; // detik Unix
	closesAt: number | null;
}

export interface ElectionStatus extends ElectionConfig {
	phase: ElectionPhase;
	now: number; // detik Unix menurut jam D1, sumber waktu yang sama dengan trigger
}

/** Jarak minimum antara saat jadwal disimpan dan waktu buka. */
export const MIN_SCHEDULE_LEAD_SECONDS = 5 * 60;

/**
 * Pemeriksaan awal jadwal sebelum disimpan, supaya pesannya ramah. Waktu buka yang sudah lewat
 * tidak bisa diperbaiki: trigger `election_config_lock_schedule` langsung mengunci jadwal (dan
 * DPT/calon) begitu `opens_at` lewat, jadi salah ketik tanggal harus ditolak di sini.
 */
export function scheduleError(
	opensAt: number,
	closesAt: number,
	nowSeconds: number
): string | null {
	if (closesAt <= opensAt) return 'Waktu tutup harus setelah waktu buka.';
	if (opensAt <= nowSeconds + MIN_SCHEDULE_LEAD_SECONDS) {
		return (
			'Waktu buka harus di masa depan, paling cepat 5 menit dari sekarang. Periksa tanggalnya: ' +
			'jadwal yang waktu bukanya sudah lewat langsung mengunci pemilihan dan tidak bisa diubah lagi.'
		);
	}
	return null;
}

/** Sama dengan aturan jendela pemilihan di migrations/0001_init.sql. */
export function electionPhase(config: ElectionConfig, nowSeconds: number): ElectionPhase {
	if (config.opensAt === null || config.closesAt === null) return 'unscheduled';
	if (nowSeconds < config.opensAt) return 'upcoming';
	if (nowSeconds < config.closesAt) return 'open';
	return 'closed';
}

export async function getElectionStatus(db: D1Database): Promise<ElectionStatus> {
	const row = await db
		.prepare(
			'SELECT title, opens_at, closes_at, unixepoch() AS now FROM election_config WHERE id = 1'
		)
		.first<{ title: string; opens_at: number | null; closes_at: number | null; now: number }>();
	if (!row) throw new Error('election_config belum diinisialisasi; jalankan migrasi D1');

	const config: ElectionConfig = {
		title: row.title,
		opensAt: row.opens_at,
		closesAt: row.closes_at
	};
	// Waktu diambil dari database, sumber waktu yang sama dengan trigger.
	return { ...config, phase: electionPhase(config, row.now), now: row.now };
}

/**
 * Mode uji coba publik (migrations/0006_uji_coba_publik.sql): situs resmi dipakai publik untuk uji
 * coba sebelum hari-H. Dimatikan hanya oleh scripts/reset-uji-coba.sql, bersamaan dengan data ujinya.
 */
export async function isPublicTest(db: D1Database): Promise<boolean> {
	const row = await db
		.prepare('SELECT public_test FROM election_config WHERE id = 1')
		.first<{ public_test: number }>();
	return row?.public_test === 1;
}
