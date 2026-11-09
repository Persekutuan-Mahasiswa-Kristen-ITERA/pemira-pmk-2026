import { fail } from '@sveltejs/kit';
import { auditStatement, describeDbError, requireAdmin } from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import { dptFingerprint, parseDpt } from '#lib/server/dpt.js';
import { getElectionStatus } from '#lib/server/election.js';
import type { Actions, PageServerLoad } from './$types';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
// D1 membatasi 100 parameter per statement: 2 kolom × 50 baris.
const ROWS_PER_INSERT = 50;

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const db = getDb();
	const [election, emails] = await Promise.all([
		getElectionStatus(db),
		db
			.prepare('SELECT email FROM voters')
			.all<{ email: string }>()
			.then((r) => r.results.map((row) => row.email))
	]);
	return {
		locked: election.phase === 'open' || election.phase === 'closed',
		count: emails.length,
		fingerprint: emails.length ? await dptFingerprint(emails) : null
	};
};

export const actions: Actions = {
	import: async ({ locals, request }) => {
		const admin = requireAdmin(locals.user);
		const file = (await request.formData()).get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Pilih berkas CSV terlebih dahulu.' });
		}
		if (file.size > MAX_FILE_BYTES)
			return fail(400, { error: 'Berkas terlalu besar (maks. 2 MB).' });

		// Berkas hanya diproses di memori; tidak disimpan di mana pun selain tabel `voters`.
		const { voters, errors } = parseDpt(await file.text());
		if (errors.length) {
			return fail(400, {
				error: `Impor dibatalkan: ${errors.length} baris bermasalah. Perbaiki berkas lalu unggah ulang.`,
				details: errors.slice(0, 20)
			});
		}

		const db = getDb();
		const fingerprint = await dptFingerprint(voters.map((v) => v.email));
		const inserts: D1PreparedStatement[] = [];
		for (let i = 0; i < voters.length; i += ROWS_PER_INSERT) {
			const chunk = voters.slice(i, i + ROWS_PER_INSERT);
			inserts.push(
				db
					.prepare(
						`INSERT INTO voters (email, name) VALUES ${chunk.map(() => '(?, ?)').join(', ')}`
					)
					.bind(...chunk.flatMap((v) => [v.email, v.name]))
			);
		}

		try {
			// Ganti seluruh DPT secara atomik. Audit log hanya mencatat jumlah dan hash,
			// bukan daftar email.
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
