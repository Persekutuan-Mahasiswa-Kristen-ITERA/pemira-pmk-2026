import { fail } from '@sveltejs/kit';
import {
	auditStatement,
	describeDbError,
	requireAdmin,
	requireSuperAdmin
} from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus, scheduleError } from '#lib/server/election.js';
import {
	approveResultsStatement,
	getParticipation,
	getResultsRelease,
	isAuditPublic,
	isPublished,
	setAuditPublicStatement,
	setResultsModeStatement
} from '#lib/server/results.js';
import { boothCodeStats, usedExceptionNims } from '#lib/server/tps.js';
import { unixToWibInput, wibInputToUnix } from '#lib/time.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const db = getDb();
	const [election, participation, boothCodes, exceptionNims, auditPublic, release] =
		await Promise.all([
			getElectionStatus(db),
			getParticipation(db),
			boothCodeStats(db),
			usedExceptionNims(db),
			isAuditPublic(db),
			getResultsRelease(db)
		]);
	return {
		election,
		participation,
		auditPublic,
		release,
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

		const db = getDb();
		const election = await getElectionStatus(db);
		// Setelah dibuka, trigger yang menolak perubahan jadwal dan memberi pesannya sendiri.
		if (election.phase === 'unscheduled' || election.phase === 'upcoming') {
			const error = scheduleError(opensAt, closesAt, election.now);
			if (error) return fail(400, { error });
		} else if (closesAt <= opensAt) {
			return fail(400, { error: 'Waktu tutup harus setelah waktu buka.' });
		}

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
	},

	/**
	 * Mode publikasi hasil (migrations/0008_publikasi_hasil.sql): otomatis saat ditutup, atau
	 * menunggu tombol Publikasikan. Hanya super admin, dan boleh diubah kapan saja (keputusan
	 * pemilik proyek). Hasil yang sudah dipublikasikan lewat tombol tetap tampil.
	 */
	resultsMode: async ({ locals, request }) => {
		const admin = requireSuperAdmin(locals);
		const form = await request.formData();
		const mode = form.get('mode');
		if (mode !== 'auto' && mode !== 'manual') return fail(400, { error: 'Mode tidak dikenal.' });

		const db = getDb();
		try {
			await db.batch([
				setResultsModeStatement(db, mode),
				auditStatement(db, admin, 'results.mode', { mode })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal mengubah mode publikasi hasil.' });
		}
		return {
			ok:
				mode === 'auto'
					? 'Hasil akan tampil otomatis begitu pemungutan suara ditutup.'
					: 'Hasil baru tampil setelah dipublikasikan dua admin (atau super admin).'
		};
	},

	/**
	 * Setujui publikasi hasil. Admin biasa: hasil tampil setelah dua admin berbeda menyetujui.
	 * Super admin: langsung tampil (`solo`). Persetujuan permanen dan tercatat di audit log.
	 */
	publish: async ({ locals }) => {
		const admin = requireAdmin(locals);
		const solo = locals.role === 'super';

		const db = getDb();
		const [election, release] = await Promise.all([getElectionStatus(db), getResultsRelease(db)]);
		if (election.phase !== 'closed') {
			return fail(409, {
				error: 'Hasil hanya bisa dipublikasikan setelah pemungutan suara ditutup.'
			});
		}
		if (release.mode !== 'manual' || release.published) {
			return fail(409, { error: 'Hasil sudah tampil di halaman Hasil.' });
		}
		if (release.approvals.some((a) => a.email === admin.email)) {
			return fail(409, { error: 'Anda sudah menyetujui. Menunggu persetujuan admin lain.' });
		}

		try {
			await db.batch([
				approveResultsStatement(db, admin.email, solo),
				auditStatement(db, admin, 'results.approve', { solo })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menyimpan persetujuan.' });
		}
		const approvals = [
			...release.approvals,
			{ email: admin.email, approvedAt: election.now, solo }
		];
		return {
			ok: isPublished(approvals)
				? 'Hasil dipublikasikan dan sekarang tampil di halaman Hasil.'
				: 'Persetujuan tersimpan. Hasil tampil setelah satu admin lain ikut menyetujui.'
		};
	},

	/**
	 * Buka/tutup audit suara publik: pencarian kode tanda terima dan unduhan CSV surat suara di
	 * halaman Hasil. Hanya berpengaruh bila perolehan suara sudah boleh tampil (`resultsVisible`).
	 */
	audit: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const enabled = form.get('enabled') === '1';

		const db = getDb();
		try {
			await db.batch([
				setAuditPublicStatement(db, enabled),
				auditStatement(db, admin, 'results.audit_public', { enabled })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal mengubah pengaturan audit suara.' });
		}
		return {
			ok: enabled
				? 'Audit suara dibuka: pencarian kode dan CSV surat suara tampil di halaman Hasil.'
				: 'Audit suara ditutup: halaman Hasil hanya menampilkan perolehan suara.'
		};
	}
};
