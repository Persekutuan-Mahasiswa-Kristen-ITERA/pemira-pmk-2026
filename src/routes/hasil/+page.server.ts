import { getDb } from '#lib/server/db.js';
import { candidatePhotos } from '#lib/server/candidates.js';
import { getElectionStatus } from '#lib/server/election.js';
import {
	getParticipation,
	getResultsRelease,
	getTally,
	isAuditPublic,
	publishedBallots,
	resultsVisible
} from '#lib/server/results.js';
import { usedExceptionNims } from '#lib/server/tps.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = getDb();
	const [election, participation, release] = await Promise.all([
		getElectionStatus(db),
		getParticipation(db),
		getResultsRelease(db)
	]);

	// Hasil dan daftar surat suara hanya dibuka setelah pemungutan suara ditutup, dan pada mode
	// tombol baru setelah dipublikasikan (migrations/0008_publikasi_hasil.sql).
	const awaitingPublish = election.phase === 'closed' && !resultsVisible(election.phase, release);
	if (!resultsVisible(election.phase, release)) {
		return { election, participation, awaitingPublish, results: null };
	}

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
		awaitingPublish,
		results: {
			tally,
			audit: published ? { ballots: published.ballots, sha256: published.sha256 } : null,
			photoByNumber,
			exceptionNims
		}
	};
};
