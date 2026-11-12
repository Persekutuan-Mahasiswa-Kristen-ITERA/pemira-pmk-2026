import { fail } from '@sveltejs/kit';
import { isValidNim, normalizeEmail } from '#lib/server/access.js';
import {
	auditStatement,
	describeDbError,
	requireAdmin,
	requireSuperAdmin
} from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import {
	approveException,
	cancelException,
	issueExceptionDirect,
	listExceptions,
	requestException,
	type ApproveFailure
} from '#lib/server/tps.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const db = getDb();
	const [election, exceptions] = await Promise.all([getElectionStatus(db), listExceptions(db)]);
	return { me: normalizeEmail(admin.email), election, exceptions };
};

const APPROVE_FAILURES: Record<ApproveFailure, string> = {
	not_found: 'Pengajuan tidak ditemukan.',
	same_admin: 'Pengajuanmu sendiri harus disetujui admin lain.',
	not_pending: 'Pengajuan ini sudah disetujui atau dibatalkan.',
	already_voted: 'NIM ini sudah memberikan suara. Batalkan pengajuannya.'
};

/** NIM dan alasan dari formulir, atau pesan kesalahannya. */
async function readForm(
	request: Request
): Promise<{ nim: string; reason: string } | { error: string }> {
	const form = await request.formData();
	const nim = String(form.get('nim') ?? '').trim();
	const reason = String(form.get('reason') ?? '').trim();
	if (!isValidNim(nim)) return { error: 'NIM harus 8–12 digit angka.' };
	if (reason.length < 3 || reason.length > 300) {
		return { error: 'Tulis alasan singkat (3–300 karakter).' };
	}
	return { nim, reason };
}

const notEligible = (reason: 'not_eligible' | 'already_voted', nim: string) =>
	reason === 'not_eligible' ? `NIM ${nim} tidak ada di DPT.` : `NIM ${nim} sudah memberikan suara.`;

export const actions: Actions = {
	request: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const input = await readForm(request);
		if ('error' in input) return fail(400, { error: input.error });
		const { nim, reason } = input;

		const db = getDb();
		let result;
		try {
			result = await requestException(db, nim, reason, normalizeEmail(admin.email));
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menyimpan pengajuan.' });
		}
		if (!result.ok) return fail(409, { error: notEligible(result.reason, nim) });
		await auditStatement(db, admin, 'exception.request', { id: result.id, nim, reason }).run();
		return {
			ok: `Pengajuan untuk ${result.name} (${nim}) tersimpan. Minta admin lain menyetujuinya dari perangkatnya sendiri.`
		};
	},

	/** Super admin membuat kode langsung, tanpa persetujuan admin kedua. */
	issue: async ({ locals, request }) => {
		const superAdmin = requireSuperAdmin(locals);
		const input = await readForm(request);
		if ('error' in input) return fail(400, { error: input.error });
		const { nim, reason } = input;

		const db = getDb();
		const election = await getElectionStatus(db);
		if (election.phase !== 'open') return fail(409, { error: 'Pemungutan suara tidak dibuka.' });

		let result;
		try {
			result = await issueExceptionDirect(db, nim, reason, normalizeEmail(superAdmin.email));
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal membuat kode.' });
		}
		if (!result.ok) return fail(409, { error: notEligible(result.reason, nim) });

		// Kode tidak dicatat di audit log; hanya ditampilkan sekali kepada super admin.
		await auditStatement(db, superAdmin, 'exception.issue', {
			id: result.id,
			nim,
			reason,
			solo: true
		}).run();
		return { approved: { id: result.id, nim, code: result.code } };
	},

	approve: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const id = String((await request.formData()).get('id') ?? '');
		const db = getDb();

		const election = await getElectionStatus(db);
		if (election.phase !== 'open') return fail(409, { error: 'Pemungutan suara tidak dibuka.' });

		const result = await approveException(db, id, normalizeEmail(admin.email));
		if (!result.ok) return fail(409, { error: APPROVE_FAILURES[result.reason] });

		// Kode tidak dicatat di audit log; hanya ditampilkan sekali kepada penyetuju.
		await auditStatement(db, admin, 'exception.approve', { id, nim: result.nim }).run();
		return { approved: { id, nim: result.nim, code: result.code } };
	},

	cancel: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const id = String((await request.formData()).get('id') ?? '');
		const db = getDb();
		const nim = await cancelException(db, id);
		if (!nim) return fail(409, { error: 'Pengajuan ini sudah dipakai atau dibatalkan.' });
		await auditStatement(db, admin, 'exception.cancel', { id, nim }).run();
		return { ok: `Pengajuan untuk NIM ${nim} dibatalkan.` };
	}
};
