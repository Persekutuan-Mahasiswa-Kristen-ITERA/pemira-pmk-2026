import { getDb } from '#lib/server/db.js';
import { candidatePhotos } from '#lib/server/candidates.js';
import { getElectionStatus } from '#lib/server/election.js';
import { getParticipation, getTally, publishedBallots } from '#lib/server/results.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = getDb();
	const [election, participation] = await Promise.all([
		getElectionStatus(db),
		getParticipation(db)
	]);

	// Hasil dan daftar surat suara hanya dibuka setelah pemungutan suara ditutup.
	if (election.phase !== 'closed') return { election, participation, results: null };

	const [tally, published, photos, ids] = await Promise.all([
		getTally(db),
		publishedBallots(db),
		candidatePhotos(db),
		db
			.prepare('SELECT id, number FROM candidates')
			.all<{ id: number; number: number }>()
			.then((r) => r.results)
	]);
	// Foto per nomor urut (tally tidak memuat id calon).
	const photoByNumber = Object.fromEntries(
		ids.filter((c) => photos.has(c.id)).map((c) => [c.number, photos.get(c.id) as string])
	);
	return {
		election,
		participation,
		results: { tally, ballots: published.ballots, sha256: published.sha256, photoByNumber }
	};
};
