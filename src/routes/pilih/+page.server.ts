import { fail, redirect } from '@sveltejs/kit';
import { nimFromEmail } from '#lib/server/access.js';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { castVote, getVoterState, type CastVoteFailure } from '#lib/server/vote.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/masuk');
	const db = getDb();
	const nim = nimFromEmail(locals.user.email);

	const [election, voterState, candidates] = await Promise.all([
		getElectionStatus(db),
		getVoterState(db, nim),
		db
			.prepare(
				'SELECT id, number, name, vision, mission, photo_url FROM candidates ORDER BY number'
			)
			.all<{
				id: number;
				number: number;
				name: string;
				vision: string;
				mission: string;
				photo_url: string | null;
			}>()
			.then((r) => r.results)
	]);

	return { email: locals.user.email, nim, election, voterState, candidates };
};

const FAILURE_MESSAGES: Record<CastVoteFailure, string> = {
	voting_closed: 'Pemungutan suara sedang tidak dibuka.',
	not_eligible: 'NIM kamu tidak terdaftar di DPT.',
	already_voted: 'Kamu sudah memberikan suara. Setiap pemilih hanya dapat memilih satu kali.',
	invalid_candidate: 'Pilihan calon tidak valid. Silakan pilih ulang.'
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) redirect(303, '/masuk');

		const candidateId = Number((await request.formData()).get('candidate'));
		if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
			return fail(400, { error: 'Pilih salah satu calon terlebih dahulu.' });
		}

		const nim = nimFromEmail(locals.user.email);
		if (!nim) return fail(403, { error: FAILURE_MESSAGES.not_eligible });

		// Jangan me-log candidateId atau hasil di sini (kerahasiaan suara).
		const result = await castVote(getDb(), nim, candidateId);
		if (!result.ok) return fail(409, { error: FAILURE_MESSAGES[result.reason] });

		return { receiptCode: result.code };
	}
};
