import { fail } from '@sveltejs/kit';
import { auditStatement, describeDbError, requireAdmin } from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { getParticipation } from '#lib/server/results.js';
import { boothCodeStats, usedExceptionNims } from '#lib/server/tps.js';
import { unixToWibInput, wibInputToUnix } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const db = getDb();
	const [election, participation, boothCodes, exceptionNims] = await Promise.all([
		getElectionStatus(db),
		getParticipation(db),
		boothCodeStats(db),
		usedExceptionNims(db)
	]);
	return {
		election,
		participation,
		tps: { boothCodes, exceptionsUsed: exceptionNims.length },
		opensInput: unixToWibInput(election.opensAt),
		closesInput: unixToWibInput(election.closesAt)
	};
};

export const actions: Actions = {
	schedule: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const opensAt = wibInputToUnix(String(form.get('opens_at') ?? ''));
		const closesAt = wibInputToUnix(String(form.get('closes_at') ?? ''));

		if (!title) return fail(400, { error: 'Judul pemilihan wajib diisi.' });
		if (opensAt === null || closesAt === null) {
			return fail(400, { error: 'Isi waktu buka dan waktu tutup dengan lengkap.' });
		}
		if (closesAt <= opensAt) return fail(400, { error: 'Waktu tutup harus setelah waktu buka.' });

		const db = getDb();
		try {
			await db.batch([
				db
					.prepare('UPDATE election_config SET title = ?, opens_at = ?, closes_at = ? WHERE id = 1')
					.bind(title, opensAt, closesAt),
				auditStatement(db, admin, 'schedule.set', {
					title,
					opens_at: opensAt,
					closes_at: closesAt
				})
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menyimpan jadwal.' });
		}
		return { ok: 'Jadwal tersimpan.' };
	},

	close: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		if (form.get('confirm') !== 'TUTUP') {
			return fail(400, { error: 'Ketik TUTUP untuk mengonfirmasi tutup darurat.' });
		}
		const reason = String(form.get('reason') ?? '').trim();
		if (!reason) return fail(400, { error: 'Alasan tutup darurat wajib diisi.' });

		const db = getDb();
		if ((await getElectionStatus(db)).phase !== 'open') {
			return fail(409, { error: 'Pemungutan suara sedang tidak berlangsung.' });
		}
		try {
			// Trigger `election_config_lock_schedule` menolak jika waktu tutup sudah lewat,
			// sehingga batch (termasuk audit log) batal bila pemilihan ternyata sudah tertutup.
			await db.batch([
				db.prepare('UPDATE election_config SET closes_at = unixepoch() WHERE id = 1'),
				auditStatement(db, admin, 'election.close_early', { reason })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menutup pemungutan suara.' });
		}
		return { ok: 'Pemungutan suara ditutup.' };
	}
};
