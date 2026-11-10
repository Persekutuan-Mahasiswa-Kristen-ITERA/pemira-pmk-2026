import { generateReceiptCode } from './receipt';

export type VoterState = 'not_eligible' | 'already_voted' | 'can_vote';

/** `nim` diambil dari email login dengan `nimFromEmail`; `null` berarti bukan pemilih. */
export async function getVoterState(db: D1Database, nim: string | null): Promise<VoterState> {
	if (!nim) return 'not_eligible';
	const row = await db
		.prepare(
			`SELECT EXISTS (SELECT 1 FROM voters WHERE nim = ?1) AS eligible,
			        EXISTS (SELECT 1 FROM voted WHERE nim = ?1) AS voted`
		)
		.bind(nim)
		.first<{ eligible: number; voted: number }>();
	if (!row?.eligible) return 'not_eligible';
	if (row.voted) return 'already_voted';
	return 'can_vote';
}

export type CastVoteFailure =
	'voting_closed' | 'not_eligible' | 'already_voted' | 'invalid_candidate' | 'no_pass';

export type CastVoteResult = { ok: true; code: string } | { ok: false; reason: CastVoteFailure };

/**
 * Simpan satu suara.
 *
 * Penanda "sudah memilih" dan surat suara anonim disimpan dalam satu `batch`
 * (transaksi D1): jika salah satu gagal, keduanya batal. Semua aturan
 * (jendela waktu, DPT, izin memilih dari TPS, satu suara per NIM) ditegakkan oleh trigger dan
 * constraint di migrations/; fungsi ini hanya menerjemahkan
 * penolakan database menjadi pesan yang bisa dipahami.
 *
 * Kode tanda terima dikembalikan ke pemilih dan TIDAK disimpan bersama
 * identitasnya. Jangan pernah me-log `candidateId` atau kode di sini.
 */
export async function castVote(
	db: D1Database,
	nim: string,
	candidateId: number,
	generateCode: () => string = generateReceiptCode
): Promise<CastVoteResult> {
	// Tabrakan kode sangat kecil kemungkinannya (50 bit); jika terjadi, seluruh
	// batch batal sehingga aman diulang dengan kode baru.
	for (let attempt = 0; attempt < 3; attempt++) {
		const code = generateCode();
		try {
			await db.batch([
				db.prepare('INSERT INTO voted (nim) VALUES (?)').bind(nim),
				db.prepare('INSERT INTO ballots (code, candidate_id) VALUES (?, ?)').bind(code, candidateId)
			]);
			return { ok: true, code };
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes('voting_closed')) return { ok: false, reason: 'voting_closed' };
			if (message.includes('not_eligible')) return { ok: false, reason: 'not_eligible' };
			if (message.includes('no_pass')) return { ok: false, reason: 'no_pass' };
			if (message.includes('voted.nim')) return { ok: false, reason: 'already_voted' };
			if (message.includes('FOREIGN KEY')) return { ok: false, reason: 'invalid_candidate' };
			if (message.includes('ballots.code')) continue;
			throw err;
		}
	}
	throw new Error('Gagal membuat kode tanda terima yang unik');
}
