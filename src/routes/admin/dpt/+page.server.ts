import { fail } from '@sveltejs/kit';
import { auditStatement, describeDbError, requireAdmin } from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import { dptFingerprint, dptInsertStatements, parseDpt } from '#lib/server/dpt.js';
import { getElectionStatus } from '#lib/server/election.js';
import type { Actions, PageServerLoad } from './$types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const db = getDb();
	const [election, nims] = await Promise.all([
		getElectionStatus(db),
		db
			.prepare('SELECT nim FROM voters')
			.all<{ nim: string }>()
			.then((r) => r.results.map((row) => row.nim))
	]);
	return {
		locked: election.phase === 'open' || election.phase === 'closed',
		count: nims.length,
		fingerprint: nims.length ? await dptFingerprint(nims) : null
	};
};

export const actions: Actions = {
	import: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const file = (await request.formData()).get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Pilih berkas CSV terlebih dahulu.' });
		}
		if (file.size > MAX_FILE_BYTES)
			return fail(400, { error: 'Berkas terlalu besar (maks. 5 MB).' });

		// Berkas hanya diproses di memori. Yang disimpan hanya NIM dan nama di tabel `voters`;
		// kolom lain di berkas (email, prodi, dst.) dibuang.
		const { voters, errors } = parseDpt(await file.text());
		if (errors.length) {
			return fail(400, {
				error: `Impor dibatalkan: ${errors.length} baris bermasalah. Perbaiki berkas lalu unggah ulang.`,
				details: errors.slice(0, 20)
			});
		}

		const db = getDb();
		const fingerprint = await dptFingerprint(voters.map((v) => v.nim));
		const inserts = dptInsertStatements(db, voters);

		try {
			// Ganti seluruh DPT secara atomik. Audit log hanya mencatat jumlah dan hash,
			// bukan daftar NIM.
			await db.batch([
				db.prepare('DELETE FROM voters'),
				...inserts,
				auditStatement(db, admin, 'dpt.replace', { count: voters.length, sha256: fingerprint })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal mengimpor DPT.' });
		}
		return { ok: `DPT diganti: ${voters.length} pemilih.` };
	}
};
