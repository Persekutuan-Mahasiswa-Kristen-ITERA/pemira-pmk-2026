import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { candidatePhotos } from '#lib/server/candidates.js';
import { cachedWhenClosed } from '#lib/server/closed-cache.js';
import { getParticipation, getResultsRelease, showsCounts } from '#lib/server/results.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = getDb();

	// Fase dibaca dulu: setelah ditutup, angka partisipasi diambil dari cache (closed-cache.ts).
	const election = await getElectionStatus(db);
	const [participation, release, candidates, photos] = await Promise.all([
		cachedWhenClosed('participation', election, () => getParticipation(db)),
		getResultsRelease(db),
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
		// Hanya angka partisipasi yang publik selama pemungutan suara, dan tidak sama sekali bila panitia
		// memilih "persentase saja" (migrations/0009_rincian_hasil.sql): dari partisipasi dan persentase
		// per calon, jumlah suara bisa dihitung.
		participation: showsCounts(release.detail, locals.role !== null)
			? { eligible: participation.eligible, voted: participation.voted }
			: null
	};
};
