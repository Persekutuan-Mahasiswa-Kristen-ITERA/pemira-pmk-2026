import { fail } from '@sveltejs/kit';
import { auditStatement, describeDbError, requireAdmin } from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { MAX_PHOTO_BYTES, sniffImageType } from '#lib/server/photos.js';
import { photoUrl } from '#lib/photo-url.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const db = getDb();
	const [election, candidates] = await Promise.all([
		getElectionStatus(db),
		db
			.prepare(
				`SELECT c.id, c.number, c.name, c.vision, c.mission, p.updated_at AS photo_version
				 FROM candidates c LEFT JOIN candidate_photos p ON p.candidate_id = c.id
				 ORDER BY c.number`
			)
			.all<{
				id: number;
				number: number;
				name: string;
				vision: string;
				mission: string;
				photo_version: number | null;
			}>()
			.then((r) => r.results)
	]);
	return {
		locked: election.phase === 'open' || election.phase === 'closed',
		candidates: candidates.map(({ photo_version, ...c }) => ({
			...c,
			photo: photoUrl(c.id, photo_version)
		}))
	};
};

function readCandidate(form: FormData) {
	const number = Number(form.get('number'));
	const name = String(form.get('name') ?? '').trim();
	const vision = String(form.get('vision') ?? '').trim();
	const mission = String(form.get('mission') ?? '').trim();
	if (!Number.isSafeInteger(number) || number <= 0) return { error: 'Nomor urut tidak valid.' };
	if (!name) return { error: 'Nama calon wajib diisi.' };
	return { candidate: { number, name, vision, mission } };
}

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const parsed = readCandidate(await request.formData());
		if (!parsed.candidate) return fail(400, { error: parsed.error });
		const c = parsed.candidate;

		const db = getDb();
		try {
			await db.batch([
				db
					.prepare('INSERT INTO candidates (number, name, vision, mission) VALUES (?, ?, ?, ?)')
					.bind(c.number, c.name, c.vision, c.mission),
				auditStatement(db, admin, 'candidate.create', c)
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menambah calon.' });
		}
		return { ok: `Calon No. ${c.number} ditambahkan.` };
	},

	update: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const id = Number(form.get('id'));
		const parsed = readCandidate(form);
		if (!Number.isSafeInteger(id)) return fail(400, { error: 'Calon tidak ditemukan.' });
		if (!parsed.candidate) return fail(400, { error: parsed.error });
		const c = parsed.candidate;

		const db = getDb();
		try {
			await db.batch([
				db
					.prepare(
						'UPDATE candidates SET number = ?, name = ?, vision = ?, mission = ? WHERE id = ?'
					)
					.bind(c.number, c.name, c.vision, c.mission, id),
				auditStatement(db, admin, 'candidate.update', { id, ...c })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menyimpan calon.' });
		}
		return { ok: `Calon No. ${c.number} disimpan.` };
	},

	delete: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isSafeInteger(id)) return fail(400, { error: 'Calon tidak ditemukan.' });

		const db = getDb();
		try {
			await db.batch([
				db.prepare('DELETE FROM candidate_photos WHERE candidate_id = ?').bind(id),
				db.prepare('DELETE FROM candidates WHERE id = ?').bind(id),
				auditStatement(db, admin, 'candidate.delete', { id })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menghapus calon.' });
		}
		return { ok: 'Calon dihapus.' };
	},

	photo: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const id = Number(form.get('id'));
		const file = form.get('photo');
		if (!Number.isSafeInteger(id)) return fail(400, { error: 'Calon tidak ditemukan.' });
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Pilih berkas foto terlebih dahulu.' });
		}
		if (file.size > MAX_PHOTO_BYTES) {
			return fail(400, { error: 'Foto terlalu besar. Gunakan foto di bawah 700 KB.' });
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		const mime = sniffImageType(bytes);
		if (!mime) return fail(400, { error: 'Format foto harus JPG, PNG, atau WebP.' });

		const db = getDb();
		try {
			await db.batch([
				db
					.prepare(
						`INSERT INTO candidate_photos (candidate_id, mime, data, updated_at)
						 VALUES (?, ?, ?, unixepoch())
						 ON CONFLICT (candidate_id) DO UPDATE
						 SET mime = excluded.mime, data = excluded.data, updated_at = excluded.updated_at`
					)
					.bind(id, mime, bytes),
				auditStatement(db, admin, 'candidate.photo', { id, mime, bytes: bytes.length })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menyimpan foto.' });
		}
		return { ok: 'Foto calon disimpan.' };
	},

	photoDelete: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isSafeInteger(id)) return fail(400, { error: 'Calon tidak ditemukan.' });

		const db = getDb();
		try {
			await db.batch([
				db.prepare('DELETE FROM candidate_photos WHERE candidate_id = ?').bind(id),
				auditStatement(db, admin, 'candidate.photo_delete', { id })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menghapus foto.' });
		}
		return { ok: 'Foto calon dihapus.' };
	}
};
