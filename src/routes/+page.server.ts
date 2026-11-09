import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = getDb();

	const [election, candidates] = await Promise.all([
		getElectionStatus(db),
		db
			.prepare('SELECT number, name FROM candidates ORDER BY number')
			.all<{ number: number; name: string }>()
			.then((r) => r.results)
	]);

	return { election, candidates };
};
