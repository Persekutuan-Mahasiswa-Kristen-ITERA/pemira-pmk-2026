import type { ElectionPhase } from './election';
import { sha256Hex } from './hash';

export interface Participation {
	eligible: number;
	voted: number;
	ballots: number;
}

export async function getParticipation(db: D1Database): Promise<Participation> {
	const row = await db
		.prepare(
			`SELECT (SELECT count(*) FROM voters) AS eligible,
			        (SELECT count(*) FROM voted) AS voted,
			        (SELECT count(*) FROM ballots) AS ballots`
		)
		.first<Participation>();
	return row ?? { eligible: 0, voted: 0, ballots: 0 };
}

export interface TallyRow {
	number: number;
	name: string;
	votes: number;
}

export async function getTally(db: D1Database): Promise<TallyRow[]> {
	const { results } = await db
		.prepare(
			`SELECT c.number, c.name, count(b.code) AS votes
			 FROM candidates c LEFT JOIN ballots b ON b.candidate_id = c.id
			 GROUP BY c.id ORDER BY c.number`
		)
		.all<TallyRow>();
	return results;
}

export interface PublishedBallot {
	code: string;
	number: number;
}

/** Semua surat suara, diurutkan berdasarkan kode (kode acak, jadi urutan tidak bermakna). */
export async function getBallots(db: D1Database): Promise<PublishedBallot[]> {
	const { results } = await db
		.prepare(
			`SELECT b.code, c.number FROM ballots b JOIN candidates c ON c.id = b.candidate_id
			 ORDER BY b.code`
		)
		.all<PublishedBallot>();
	return results;
}

/** Format CSV yang dipublikasikan. Hash dihitung dari teks persis ini. */
export function ballotsCsv(ballots: PublishedBallot[]): string {
	return 'kode,nomor_calon\n' + ballots.map((b) => `${b.code},${b.number}\n`).join('');
}

export async function publishedBallots(db: D1Database) {
	const ballots = await getBallots(db);
	const csv = ballotsCsv(ballots);
	return { ballots, csv, sha256: await sha256Hex(csv) };
}

/**
 * Apakah bagian audit (pencarian kode tanda terima dan CSV surat suara) dibuka ke publik.
 * Diaktifkan admin dari panel Admin; hanya berpengaruh bila hasil sudah boleh tampil
 * (`resultsVisible`).
 */
export async function isAuditPublic(db: D1Database): Promise<boolean> {
	const row = await db
		.prepare('SELECT audit_public FROM election_config WHERE id = 1')
		.first<{ audit_public: number }>();
	return row?.audit_public === 1;
}

/** Pernyataan untuk mengubah flag audit publik; dijalankan dalam satu batch dengan audit log. */
export function setAuditPublicStatement(db: D1Database, enabled: boolean): D1PreparedStatement {
	return db
		.prepare('UPDATE election_config SET audit_public = ? WHERE id = 1')
		.bind(enabled ? 1 : 0);
}

export type ResultsMode = 'auto' | 'manual';

export interface ResultsApproval {
	email: string;
	approvedAt: number;
	solo: boolean;
}

export interface ResultsRelease {
	mode: ResultsMode;
	approvals: ResultsApproval[];
	/** Sudah dipublikasikan lewat tombol (dua admin berbeda, atau satu super admin). */
	published: boolean;
}

/** Aturan publikasi (migrations/0008_publikasi_hasil.sql): dua admin berbeda, atau satu baris solo. */
export function isPublished(approvals: ResultsApproval[]): boolean {
	return approvals.length >= 2 || approvals.some((a) => a.solo);
}

/**
 * Apakah perolehan suara (dan bagian audit) boleh dikirim ke siapa pun. Sebelum ditutup: tidak
 * pernah. Setelah ditutup: langsung pada mode otomatis, atau setelah dipublikasikan pada mode
 * tombol. Berlaku sama untuk publik dan admin.
 */
export function resultsVisible(phase: ElectionPhase, release: ResultsRelease): boolean {
	return phase === 'closed' && (release.mode === 'auto' || release.published);
}

export async function getResultsRelease(db: D1Database): Promise<ResultsRelease> {
	const [config, { results }] = await Promise.all([
		db
			.prepare('SELECT results_mode FROM election_config WHERE id = 1')
			.first<{ results_mode: ResultsMode }>(),
		db
			.prepare(
				'SELECT admin_email, approved_at, solo FROM results_approvals ORDER BY approved_at, admin_email'
			)
			.all<{ admin_email: string; approved_at: number; solo: number }>()
	]);
	const approvals = results.map((r) => ({
		email: r.admin_email,
		approvedAt: r.approved_at,
		solo: r.solo === 1
	}));
	return { mode: config?.results_mode ?? 'auto', approvals, published: isPublished(approvals) };
}

/** Pernyataan untuk mengubah mode publikasi; dijalankan dalam satu batch dengan audit log. */
export function setResultsModeStatement(db: D1Database, mode: ResultsMode): D1PreparedStatement {
	return db.prepare('UPDATE election_config SET results_mode = ? WHERE id = 1').bind(mode);
}

/** Pernyataan persetujuan publikasi; dijalankan dalam satu batch dengan audit log. */
export function approveResultsStatement(
	db: D1Database,
	email: string,
	solo: boolean
): D1PreparedStatement {
	return db
		.prepare('INSERT INTO results_approvals (admin_email, solo) VALUES (?, ?)')
		.bind(email, solo ? 1 : 0);
}
