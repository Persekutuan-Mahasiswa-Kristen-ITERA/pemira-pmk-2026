import { fail } from '@sveltejs/kit';
import { auditStatement, describeDbError, requireAdmin } from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const db = getDb();
	const [election, candidates] = await Promise.all([
		getElectionStatus(db),
		db
			.prepare('SELECT id, number, name, vision, mission FROM candidates ORDER BY number')
			.all<{ id: number; number: number; name: string; vision: string; mission: string }>()
			.then((r) => r.results)
	]);
	return { locked: election.phase === 'open' || election.phase === 'closed', candidates };
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
		const admin = requireAdmin(locals.user);
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
		const admin = requireAdmin(locals.user);
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
		const admin = requireAdmin(locals.user);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isSafeInteger(id)) return fail(400, { error: 'Calon tidak ditemukan.' });

		const db = getDb();
		try {
			await db.batch([
				db.prepare('DELETE FROM candidates WHERE id = ?').bind(id),
				auditStatement(db, admin, 'candidate.delete', { id })
			]);
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal menghapus calon.' });
		}
		return { ok: 'Calon dihapus.' };
	}
};
