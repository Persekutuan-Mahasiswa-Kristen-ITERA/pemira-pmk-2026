import { getDb } from '#lib/server/db.js';
import { candidatePhotos } from '#lib/server/candidates.js';
import { getElectionStatus } from '#lib/server/election.js';
import {
	getParticipation,
	getTally,
	isAuditPublic,
	publishedBallots
} from '#lib/server/results.js';
import { usedExceptionNims } from '#lib/server/tps.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = getDb();
	const [election, participation] = await Promise.all([
		getElectionStatus(db),
		getParticipation(db)
	]);

	// Hasil dan daftar surat suara hanya dibuka setelah pemungutan suara ditutup.
	if (election.phase !== 'closed') return { election, participation, results: null };

	// Pencarian kode dan daftar surat suara (CSV + SHA-256) hanya dikirim bila admin sudah
	// membuka audit suara ke publik; sebelum itu, kode tidak pernah meninggalkan server.
	const auditPublic = await isAuditPublic(db);
	const [tally, published, photos, ids, exceptionNims] = await Promise.all([
		getTally(db),
		auditPublic ? publishedBallots(db) : null,
		candidatePhotos(db),
		db
			.prepare('SELECT id, number FROM candidates')
			.all<{ id: number; number: number }>()
			.then((r) => r.results),
		usedExceptionNims(db)
	]);
	// Foto per nomor urut (tally tidak memuat id calon).
	const photoByNumber = Object.fromEntries(
		ids.filter((c) => photos.has(c.id)).map((c) => [c.number, photos.get(c.id) as string])
	);
	return {
		election,
		participation,
		results: {
			tally,
			audit: published ? { ballots: published.ballots, sha256: published.sha256 } : null,
			photoByNumber,
			exceptionNims
		}
	};
};
