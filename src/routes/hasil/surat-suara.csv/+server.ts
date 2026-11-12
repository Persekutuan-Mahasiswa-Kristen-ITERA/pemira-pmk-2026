import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import {
	getResultsRelease,
	isAuditPublic,
	publishedBallots,
	resultsVisible,
	showsCounts
} from '#lib/server/results.js';
import type { RequestHandler } from './$types';

/**
 * Daftar semua surat suara (kode → nomor calon): hanya setelah pemungutan suara ditutup, hasil
 * boleh tampil (otomatis atau sudah dipublikasikan), DAN admin membuka audit suara ke publik.
 * Pada rincian "persentase saja" CSV hanya untuk admin, karena CSV memuat jumlah suara.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const db = getDb();
	const [election, auditPublic, release] = await Promise.all([
		getElectionStatus(db),
		isAuditPublic(db),
		getResultsRelease(db)
	]);
	if (election.phase !== 'closed') {
		error(404, 'Daftar surat suara dibuka setelah pemungutan suara ditutup.');
	}
	if (!resultsVisible(election.phase, release)) error(404, 'Hasil belum dipublikasikan.');
	if (!auditPublic) error(404, 'Audit suara belum dibuka oleh panitia.');
	if (!showsCounts(release.detail, locals.role !== null)) {
		error(404, 'Panitia hanya mempublikasikan persentase suara.');
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
