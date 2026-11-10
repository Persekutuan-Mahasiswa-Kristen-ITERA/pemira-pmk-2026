import { getDb } from '#lib/server/db.js';
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

	const [tally, published] = await Promise.all([getTally(db), publishedBallots(db)]);
	return {
		election,
		participation,
		results: { tally, ballots: published.ballots, sha256: published.sha256 }
	};
};
