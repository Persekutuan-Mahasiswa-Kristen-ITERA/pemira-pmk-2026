import { fail } from '@sveltejs/kit';
import { isValidNim, normalizeEmail } from '#lib/server/access.js';
import {
	auditStatement,
	describeDbError,
	requireAdmin,
	requireSuperAdmin
} from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import {
	addVoter,
	dptFingerprint,
	dptInsertStatements,
	listVoterAdditions,
	parseDpt
} from '#lib/server/dpt.js';
import { getElectionStatus } from '#lib/server/election.js';
import type { Actions, PageServerLoad } from './$types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const db = getDb();
	const [election, nims, additions] = await Promise.all([
		getElectionStatus(db),
		db
			.prepare('SELECT nim FROM voters')
			.all<{ nim: string }>()
			.then((r) => r.results.map((row) => row.nim)),
		listVoterAdditions(db)
	]);
	// Sidik jari DPT tanpa pemilih tambahan: sama dengan angka yang diumumkan saat DPT dikunci,
	// selama penambahan hanya terjadi sesudah pengumuman itu.
	const added = new Set(additions.map((a) => a.nim));
	const baseNims = nims.filter((nim) => !added.has(nim));
	return {
		phase: election.phase,
		locked: election.phase === 'open' || election.phase === 'closed',
		count: nims.length,
		fingerprint: nims.length ? await dptFingerprint(nims) : null,
		additions,
		baseCount: baseNims.length,
		baseFingerprint: additions.length && baseNims.length ? await dptFingerprint(baseNims) : null
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
	},

	/**
	 * Super admin menambah satu pemilih, juga saat pemungutan suara berlangsung
	 * (migrations/0010_tambah_pemilih.sql). Kelayakannya (mahasiswa aktif, Kristen Protestan) dicek
	 * panitia di luar sistem; buktinya ditulis di alasan.
	 */
	add: async ({ locals, request }) => {
		const superAdmin = requireSuperAdmin(locals);
		const form = await request.formData();
		const nim = String(form.get('nim') ?? '').trim();
		const name = String(form.get('name') ?? '')
			.trim()
			.replace(/\s+/g, ' ');
		const reason = String(form.get('reason') ?? '').trim();
		const values = { nim, name, reason };
		if (!isValidNim(nim)) return fail(400, { addError: 'NIM harus 8–12 digit angka.', values });
		if (name.length < 2 || name.length > 100) {
			return fail(400, { addError: 'Tulis nama lengkap (2–100 karakter).', values });
		}
		if (reason.length < 3 || reason.length > 300) {
			return fail(400, {
				addError: 'Tulis alasan dan bukti pengecekan (3–300 karakter).',
				values
			});
		}

		const db = getDb();
		const election = await getElectionStatus(db);
		if (election.phase === 'closed') {
			return fail(409, { addError: 'Pemungutan suara sudah ditutup.', values });
		}

		let result;
		try {
			result = await addVoter(
				db,
				{ nim, name, reason, addedBy: normalizeEmail(superAdmin.email) },
				auditStatement(db, superAdmin, 'dpt.add', { nim, reason })
			);
		} catch (err) {
			return fail(409, {
				addError: describeDbError(err) ?? 'Gagal menambah pemilih.',
				values
			});
		}
		if (!result.ok) return fail(409, { addError: `NIM ${nim} sudah ada di DPT.`, values });
		return {
			added: `${name} (${nim}) ditambahkan ke DPT. Pemilih bisa langsung masuk dengan Google dan memilih di TPS.`
		};
	}
};
