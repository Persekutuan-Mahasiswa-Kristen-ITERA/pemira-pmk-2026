export type ElectionPhase = 'unscheduled' | 'upcoming' | 'open' | 'closed';

export interface ElectionConfig {
	title: string;
	opensAt: number | null; // detik Unix
	closesAt: number | null;
}

export interface ElectionStatus extends ElectionConfig {
	phase: ElectionPhase;
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
	return { ...config, phase: electionPhase(config, row.now) };
}
