import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { getParticipation } from '#lib/server/results.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = getDb();

	const [election, participation, candidates] = await Promise.all([
		getElectionStatus(db),
		getParticipation(db),
		db
			.prepare('SELECT number, name FROM candidates ORDER BY number')
			.all<{ number: number; name: string }>()
			.then((r) => r.results)
	]);

	return {
		election,
		candidates,
		// Hanya angka partisipasi yang publik selama pemungutan suara.
		participation: { eligible: participation.eligible, voted: participation.voted }
	};
};
