import { fail } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.js';
import { candidatePhotos } from '#lib/server/candidates.js';
import { getElectionStatus } from '#lib/server/election.js';
import {
	findBallot,
	getParticipation,
	getResultsRelease,
	getTally,
	isAuditPublic,
	publishedBallots,
	resultsVisible,
	showsCounts,
	shownTally
} from '#lib/server/results.js';
import { usedExceptionNims } from '#lib/server/tps.js';
import { normalizeReceiptCode } from '#lib/receipt-code.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = getDb();
	const [election, participation, release] = await Promise.all([
		getElectionStatus(db),
		getParticipation(db),
		getResultsRelease(db)
	]);

	// Pada rincian "persentase saja" (migrations/0009_rincian_hasil.sql), publik tidak menerima angka
	// apa pun yang bisa dipakai menghitung jumlah suara. Admin tetap melihat angka lengkap.
	const isAdmin = locals.role !== null;
	const withCounts = showsCounts(release.detail, isAdmin);
	const shownParticipation = withCounts ? participation : null;
	const view = { publicDetail: release.detail, adminView: isAdmin && release.detail === 'percent' };

	// Hasil dan daftar surat suara hanya dibuka setelah pemungutan suara ditutup, dan pada mode
	// tombol baru setelah dipublikasikan (migrations/0008_publikasi_hasil.sql).
	const awaitingPublish = election.phase === 'closed' && !resultsVisible(election.phase, release);
	if (!resultsVisible(election.phase, release)) {
		return { election, participation: shownParticipation, ...view, awaitingPublish, results: null };
	}

	// Pencarian kode dan daftar surat suara (CSV + SHA-256) hanya tersedia bila admin sudah membuka
	// audit suara ke publik. Kode tidak pernah dikirim sebagai daftar ke browser: pencarian lewat
	// action `periksa`, satu kode per permintaan. CSV hanya bila penampil boleh melihat angka.
	const auditPublic = await isAuditPublic(db);
	const [tally, published, photos, ids, exceptionNims] = await Promise.all([
		getTally(db),
		auditPublic && withCounts ? publishedBallots(db) : null,
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
		participation: shownParticipation,
		...view,
		awaitingPublish,
		results: {
			tally: shownTally(tally, withCounts),
			// Tanpa angka: cukup tanda apakah jumlah surat suara sama dengan jumlah yang sudah memilih.
			balanced: participation.voted === participation.ballots,
			audit: auditPublic
				? {
						csv: published ? { count: published.ballots.length, sha256: published.sha256 } : null
					}
				: null,
			photoByNumber,
			exceptionNims
		}
	};
};

export const actions: Actions = {
	/** Periksa satu kode tanda terima. Syaratnya sama dengan bagian audit di halaman ini. */
	periksa: async ({ request }) => {
		const form = await request.formData();
		const code = normalizeReceiptCode(String(form.get('code') ?? ''));

		const db = getDb();
		const [election, release, auditPublic] = await Promise.all([
			getElectionStatus(db),
			getResultsRelease(db),
			isAuditPublic(db)
		]);
		if (!resultsVisible(election.phase, release) || !auditPublic) {
			return fail(404, { code, lookupError: 'Pemeriksaan kode belum dibuka oleh panitia.' });
		}
		if (!/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/.test(code)) {
			return fail(400, {
				code,
				lookupError: 'Kode tanda terima berformat XXXXX-XXXXX (10 karakter). Periksa penulisannya.'
			});
		}
		return { code, number: await findBallot(db, code) };
	}
};
