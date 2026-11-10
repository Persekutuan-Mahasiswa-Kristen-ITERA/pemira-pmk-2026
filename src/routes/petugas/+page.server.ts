import { fail } from '@sveltejs/kit';
import { describeDbError, requireOfficer } from '#lib/server/admin.js';
import { getDb } from '#lib/server/db.js';
import { getElectionStatus } from '#lib/server/election.js';
import { isValidNim, normalizeEmail } from '#lib/server/access.js';
import {
	BOOTH_CODE_TTL,
	boothCodeStatement,
	boothCodeStats,
	generateCode
} from '#lib/server/tps.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const officer = requireOfficer(locals);
	const db = getDb();
	const [election, mine] = await Promise.all([
		getElectionStatus(db),
		boothCodeStats(db, normalizeEmail(officer.email))
	]);
	return {
		officerEmail: officer.email,
		election,
		mine
	};
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const officer = requireOfficer(locals);
		const db = getDb();
		const code = generateCode(6);
		try {
			// Tabel booth_codes sendiri menjadi catatannya (pembuat, waktu, dipakai atau tidak;
			// tidak bisa diubah atau dihapus), jadi tidak perlu ribuan baris di audit log.
			// Kode tidak pernah disimpan; yang disimpan hanya hash-nya.
			await (await boothCodeStatement(db, normalizeEmail(officer.email), code)).run();
		} catch (err) {
			return fail(409, { error: describeDbError(err) ?? 'Gagal membuat kode.' });
		}
		return { code, ttl: BOOTH_CODE_TTL };
	},

	/** Cek apakah NIM ada di DPT (tanpa menampilkan apakah sudah memilih). */
	check: async ({ locals, request }) => {
		requireOfficer(locals);
		const nim = String((await request.formData()).get('nim') ?? '').trim();
		if (!isValidNim(nim)) return fail(400, { checkError: 'NIM harus 8–12 digit angka.' });
		const voter = await getDb()
			.prepare('SELECT name FROM voters WHERE nim = ?')
			.bind(nim)
			.first<{ name: string }>();
		return { checked: { nim, name: voter?.name ?? null } };
	}
};
