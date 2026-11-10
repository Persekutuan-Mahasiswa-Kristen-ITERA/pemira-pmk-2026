import { fail, redirect } from '@sveltejs/kit';
import { nimFromEmail } from '#lib/server/access.js';
import { cookieBase } from '#lib/server/cookies.js';
import { getDb } from '#lib/server/db.js';
import { candidatePhotos } from '#lib/server/candidates.js';
import { getElectionStatus } from '#lib/server/election.js';
import {
	PASS_COOKIE,
	passCookieOptions,
	redeemBoothCode,
	type RedeemFailure
} from '#lib/server/tps.js';
import { castVote, getVoterState, type CastVoteFailure } from '#lib/server/vote.js';
import type { Actions, PageServerLoad } from './$types';

interface Voter {
	nim: string | null;
	/** Email Google, atau null untuk pemilih yang masuk dengan kode pengecualian. */
	email: string | null;
}

/** Pemilih lewat login Google, atau lewat kode pengecualian (izinnya sekaligus identitas). */
function currentVoter(locals: App.Locals): Voter {
	if (locals.user) return { nim: nimFromEmail(locals.user.email), email: locals.user.email };
	if (locals.pass?.via === 'exception') return { nim: locals.pass.nim, email: null };
	redirect(303, '/masuk');
}

/** Batas waktu izin memilih milik pemilih ini di perangkat ini, atau null. */
function passExpiresAt(locals: App.Locals, nim: string | null): number | null {
	return nim !== null && locals.pass?.nim === nim ? locals.pass.expiresAt : null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const voter = currentVoter(locals);
	const db = getDb();

	const [election, voterState, candidates, photos] = await Promise.all([
		getElectionStatus(db),
		getVoterState(db, voter.nim),
		db
			.prepare('SELECT id, number, name, vision, mission FROM candidates ORDER BY number')
			.all<{ id: number; number: number; name: string; vision: string; mission: string }>()
			.then((r) => r.results),
		candidatePhotos(db)
	]);

	return {
		email: voter.email,
		nim: voter.nim,
		election,
		voterState,
		passExpiresAt: passExpiresAt(locals, voter.nim),
		serverNow: Math.floor(Date.now() / 1000),
		candidates: candidates.map((c) => ({ ...c, photo: photos.get(c.id) ?? null }))
	};
};

const FAILURE_MESSAGES: Record<CastVoteFailure, string> = {
	voting_closed: 'Pemungutan suara sedang tidak dibuka.',
	not_eligible: 'NIM kamu tidak terdaftar di DPT.',
	already_voted: 'Kamu sudah memberikan suara. Setiap pemilih hanya dapat memilih satu kali.',
	invalid_candidate: 'Pilihan calon tidak valid. Silakan pilih ulang.',
	no_pass: 'Waktu memilihmu (5 menit) sudah habis. Minta kode TPS baru ke petugas.'
};

const UNLOCK_MESSAGES: Record<RedeemFailure, string> = {
	invalid_code:
		'Kode tidak berlaku: salah ketik, sudah dipakai, atau sudah lewat 2 menit. Minta kode baru ke petugas.',
	not_eligible: FAILURE_MESSAGES.not_eligible,
	already_voted: FAILURE_MESSAGES.already_voted
};

export const actions: Actions = {
	/** Pemilih yang login Google memasukkan kode TPS dari petugas. */
	unlock: async ({ locals, request, cookies, url }) => {
		if (!locals.user) redirect(303, '/masuk');
		const nim = nimFromEmail(locals.user.email);
		if (!nim) return fail(403, { unlockError: UNLOCK_MESSAGES.not_eligible });

		const code = String((await request.formData()).get('code') ?? '');
		if (!code.trim()) return fail(400, { unlockError: 'Masukkan kode TPS dari petugas.' });

		const result = await redeemBoothCode(getDb(), nim, code);
		if (!result.ok) return fail(403, { unlockError: UNLOCK_MESSAGES[result.reason] });

		cookies.set(PASS_COOKIE, result.token, passCookieOptions(result.expiresAt, url));
		return { unlocked: true };
	},

	vote: async ({ locals, request, cookies, url }) => {
		const voter = currentVoter(locals);

		const candidateId = Number((await request.formData()).get('candidate'));
		if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
			return fail(400, { error: 'Pilih salah satu calon terlebih dahulu.' });
		}
		if (!voter.nim) return fail(403, { error: FAILURE_MESSAGES.not_eligible });
		// Izin harus berasal dari cookie perangkat ini; database juga menolak suara tanpa izin.
		if (passExpiresAt(locals, voter.nim) === null) {
			return fail(403, { error: FAILURE_MESSAGES.no_pass });
		}

		// Jangan me-log candidateId atau hasil di sini (kerahasiaan suara).
		const result = await castVote(getDb(), voter.nim, candidateId);
		if (!result.ok) return fail(409, { error: FAILURE_MESSAGES[result.reason] });

		// Izin sudah dihapus database bersama suara ini; hapus juga cookie-nya.
		cookies.delete(PASS_COOKIE, cookieBase(url));
		return { receiptCode: result.code };
	}
};
