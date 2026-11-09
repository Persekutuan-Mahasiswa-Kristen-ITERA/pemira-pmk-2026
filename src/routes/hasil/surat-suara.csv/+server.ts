import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { publishedBallots } from '#lib/server/results.js';
import type { RequestHandler } from './$types';

/** Daftar semua surat suara (kode → nomor calon), hanya setelah pemungutan suara ditutup. */
export const GET: RequestHandler = async () => {
	const db = getDb();
	if ((await getElectionStatus(db)).phase !== 'closed') {
		error(404, 'Daftar surat suara dibuka setelah pemungutan suara ditutup.');
	}
	const { csv, sha256 } = await publishedBallots(db);
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="surat-suara-pemira-pmk-itera-2027.csv"',
			'x-content-sha256': sha256
		}
	});
};
