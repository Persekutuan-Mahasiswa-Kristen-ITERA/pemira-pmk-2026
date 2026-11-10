import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { isAuditPublic, publishedBallots } from '#lib/server/results.js';
import type { RequestHandler } from './$types';

/**
 * Daftar semua surat suara (kode → nomor calon): hanya setelah pemungutan suara ditutup DAN
 * admin membuka audit suara ke publik.
 */
export const GET: RequestHandler = async () => {
	const db = getDb();
	const [election, auditPublic] = await Promise.all([getElectionStatus(db), isAuditPublic(db)]);
	if (election.phase !== 'closed') {
		error(404, 'Daftar surat suara dibuka setelah pemungutan suara ditutup.');
	}
	if (!auditPublic) error(404, 'Audit suara belum dibuka oleh panitia.');
	const { csv, sha256 } = await publishedBallots(db);
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="surat-suara-pemira-pmk-itera-2027.csv"',
			'x-content-sha256': sha256
		}
	});
};
