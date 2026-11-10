import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { candidatePhotos } from '#lib/server/candidates.js';
import { getParticipation } from '#lib/server/results.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = getDb();

	const [election, participation, candidates, photos] = await Promise.all([
		getElectionStatus(db),
		getParticipation(db),
		db
			.prepare('SELECT id, number, name FROM candidates ORDER BY number')
			.all<{ id: number; number: number; name: string }>()
			.then((r) => r.results),
		candidatePhotos(db)
	]);

	return {
		election,
		candidates: candidates.map((c) => ({
			number: c.number,
			name: c.name,
			photo: photos.get(c.id) ?? null
		})),
		// Hanya angka partisipasi yang publik selama pemungutan suara.
		participation: { eligible: participation.eligible, voted: participation.voted }
	};
};
