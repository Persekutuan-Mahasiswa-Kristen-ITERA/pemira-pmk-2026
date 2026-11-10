/**
 * Pemungutan suara di TPS: kode TPS, kode pengecualian, dan izin memilih.
 * Aturan yang sama ditegakkan di database (migrations/0004_tps.sql); modul ini tidak
 * membaca `env` supaya bisa dites dengan SQLite biasa.
 *
 * Kerahasiaan: kode TPS tidak pernah dikaitkan ke NIM, dan tidak ada kode atau izin yang
 * dikaitkan ke surat suara. Jangan pernah me-log kode, token sesi, atau pilihan.
 */
import { sha256Hex } from './hash';
import { RECEIPT_ALPHABET } from './receipt';
import { getVoterState, type VoterState } from './vote';
import { cookieBase } from './cookies';

/** Cookie berisi token izin memilih (httpOnly). */
export const PASS_COOKIE = 'pemira_pass';
/** Kode TPS berlaku 2 menit sejak dibuat. */
export const BOOTH_CODE_TTL = 120;
/** Kode pengecualian berlaku 5 menit sejak disetujui. */
export const EXCEPTION_CODE_TTL = 300;
/** Setelah kode diterima, pemilih punya 5 menit untuk memilih. */
export const PASS_TTL = 300;

/** Kode acak dari alfabet Crockford (tanpa I, L, O, U), dipisah tanda hubung di tengah. */
export function generateCode(length: number): string {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	const chars = Array.from(bytes, (b) => RECEIPT_ALPHABET[b & 31]).join('');
	const half = Math.ceil(length / 2);
	return `${chars.slice(0, half)}-${chars.slice(half)}`;
}

/**
 * Bentuk baku kode yang diketik: huruf besar, tanpa spasi atau tanda hubung, dan huruf
 * yang mirip angka diganti (O→0, I/L→1) sesuai aturan Crockford.
 */
export function normalizeCode(input: string): string {
	return input
		.toUpperCase()
		.replace(/[^0-9A-Z]/g, '')
		.replace(/O/g, '0')
		.replace(/[IL]/g, '1');
}

export const hashCode = (code: string) => sha256Hex(normalizeCode(code));

function randomToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Izin memilih
// ---------------------------------------------------------------------------

export interface VotePass {
	nim: string;
	via: 'tps' | 'exception';
	/** Detik Unix. */
	expiresAt: number;
}

/** Izin yang masih berlaku untuk token di cookie, atau null. */
export async function getPass(db: D1Database, token: string): Promise<VotePass | null> {
	if (!token || token.length > 100) return null;
	const row = await db
		.prepare(
			`SELECT nim, via, expires_at FROM vote_passes
			 WHERE session_hash = ? AND expires_at > unixepoch()`
		)
		.bind(await sha256Hex(token))
		.first<{ nim: string; via: VotePass['via']; expires_at: number }>();
	return row ? { nim: row.nim, via: row.via, expiresAt: row.expires_at } : null;
}

/** Buat (atau ganti) izin memilih untuk NIM ini. Kembalikan token untuk cookie. */
async function issuePass(
	db: D1Database,
	nim: string,
	via: VotePass['via']
): Promise<{ token: string; expiresAt: number }> {
	const token = randomToken();
	const row = await db
		.prepare(
			`INSERT INTO vote_passes (nim, session_hash, via, expires_at)
			 VALUES (?1, ?2, ?3, unixepoch() + ?4)
			 ON CONFLICT (nim) DO UPDATE SET
				session_hash = excluded.session_hash,
				via = excluded.via,
				expires_at = excluded.expires_at
			 RETURNING expires_at`
		)
		.bind(nim, await sha256Hex(token), via, PASS_TTL)
		.first<{ expires_at: number }>();
	if (!row) throw new Error('Gagal membuat izin memilih');
	return { token, expiresAt: row.expires_at };
}

// ---------------------------------------------------------------------------
// Kode TPS (Petugas TPS)
// ---------------------------------------------------------------------------

/** Statement pembuatan kode TPS; dijalankan dalam batch bersama audit log. */
export async function boothCodeStatement(db: D1Database, officerEmail: string, code: string) {
	return db
		.prepare(
			`INSERT INTO booth_codes (code_hash, created_by, expires_at)
			 VALUES (?, ?, unixepoch() + ?)`
		)
		.bind(await hashCode(code), officerEmail, BOOTH_CODE_TTL);
}

export type RedeemFailure = 'invalid_code' | Exclude<VoterState, 'can_vote'>;

export type RedeemResult =
	| { ok: true; nim: string; token: string; expiresAt: number }
	| { ok: false; reason: RedeemFailure };

/**
 * Tukar kode TPS menjadi izin memilih untuk NIM pemilih yang login Google.
 * Status pemilih dicek lebih dulu supaya kode tidak terbuang.
 */
export async function redeemBoothCode(
	db: D1Database,
	nim: string,
	code: string
): Promise<RedeemResult> {
	const state = await getVoterState(db, nim);
	if (state !== 'can_vote') return { ok: false, reason: state };

	// UPDATE ... WHERE used_at IS NULL bersifat atomik: kode yang sama tidak bisa dipakai dua kali.
	const used = await db
		.prepare(
			`UPDATE booth_codes SET used_at = unixepoch()
			 WHERE code_hash = ? AND used_at IS NULL AND expires_at > unixepoch()
			 RETURNING 1 AS ok`
		)
		.bind(await hashCode(code))
		.first<{ ok: number }>();
	if (!used) return { ok: false, reason: 'invalid_code' };

	return { ok: true, nim, ...(await issuePass(db, nim, 'tps')) };
}

export interface CodeStats {
	created: number;
	used: number;
	expired: number;
	active: number;
}

/** Penghitung kode TPS untuk rekonsiliasi; `createdBy` membatasi ke satu petugas. */
export async function boothCodeStats(db: D1Database, createdBy?: string): Promise<CodeStats> {
	const where = createdBy === undefined ? '' : 'WHERE created_by = ?';
	const stmt = db.prepare(
		`SELECT count(*) AS created,
		        coalesce(sum(used_at IS NOT NULL), 0) AS used,
		        coalesce(sum(used_at IS NULL AND expires_at <= unixepoch()), 0) AS expired,
		        coalesce(sum(used_at IS NULL AND expires_at > unixepoch()), 0) AS active
		 FROM booth_codes ${where}`
	);
	const row = await (createdBy === undefined ? stmt : stmt.bind(createdBy)).first<CodeStats>();
	return row ?? { created: 0, used: 0, expired: 0, active: 0 };
}

// ---------------------------------------------------------------------------
// Kode pengecualian (tanpa login Google; dua admin)
// ---------------------------------------------------------------------------

export type ExceptionStatus = 'pending' | 'active' | 'used' | 'expired' | 'cancelled';

export interface ExceptionRow {
	id: string;
	nim: string;
	name: string;
	reason: string;
	requestedBy: string;
	requestedAt: number;
	approvedBy: string | null;
	approvedAt: number | null;
	expiresAt: number | null;
	usedAt: number | null;
	status: ExceptionStatus;
}

export async function listExceptions(db: D1Database): Promise<ExceptionRow[]> {
	const { results } = await db
		.prepare(
			`SELECT e.id, e.nim, v.name, e.reason, e.requested_by, e.requested_at, e.approved_by,
			        e.approved_at, e.expires_at, e.used_at, e.cancelled_at, unixepoch() AS now
			 FROM exception_codes e JOIN voters v ON v.nim = e.nim
			 ORDER BY e.requested_at DESC, e.id`
		)
		.all<{
			id: string;
			nim: string;
			name: string;
			reason: string;
			requested_by: string;
			requested_at: number;
			approved_by: string | null;
			approved_at: number | null;
			expires_at: number | null;
			used_at: number | null;
			cancelled_at: number | null;
			now: number;
		}>();
	return results.map((r) => ({
		id: r.id,
		nim: r.nim,
		name: r.name,
		reason: r.reason,
		requestedBy: r.requested_by,
		requestedAt: r.requested_at,
		approvedBy: r.approved_by,
		approvedAt: r.approved_at,
		expiresAt: r.expires_at,
		usedAt: r.used_at,
		status:
			r.used_at !== null
				? 'used'
				: r.cancelled_at !== null
					? 'cancelled'
					: r.approved_by === null
						? 'pending'
						: (r.expires_at ?? 0) > r.now
							? 'active'
							: 'expired'
	}));
}

export type ExceptionRequestResult =
	{ ok: true; id: string; name: string } | { ok: false; reason: 'not_eligible' | 'already_voted' };

/** Pengajuan oleh admin pertama. Statement audit dibuat pemanggil dari hasilnya. */
export async function requestException(
	db: D1Database,
	nim: string,
	reason: string,
	requestedBy: string
): Promise<ExceptionRequestResult> {
	const voter = await db
		.prepare('SELECT name FROM voters WHERE nim = ?')
		.bind(nim)
		.first<{ name: string }>();
	if (!voter) return { ok: false, reason: 'not_eligible' };
	if ((await getVoterState(db, nim)) === 'already_voted') {
		return { ok: false, reason: 'already_voted' };
	}
	const id = randomToken().slice(0, 16);
	await db
		.prepare('INSERT INTO exception_codes (id, nim, reason, requested_by) VALUES (?, ?, ?, ?)')
		.bind(id, nim, reason.trim(), requestedBy)
		.run();
	return { ok: true, id, name: voter.name };
}

export type ApproveFailure = 'not_found' | 'same_admin' | 'not_pending' | 'already_voted';

export type ApproveResult =
	| { ok: true; nim: string; code: string; expiresAt: number }
	| { ok: false; reason: ApproveFailure };

/** Persetujuan oleh admin kedua; kode hanya dikembalikan sekali, ke penyetuju. */
export async function approveException(
	db: D1Database,
	id: string,
	approvedBy: string
): Promise<ApproveResult> {
	const row = await db
		.prepare(
			'SELECT nim, requested_by, approved_by, cancelled_at FROM exception_codes WHERE id = ?'
		)
		.bind(id)
		.first<{
			nim: string;
			requested_by: string;
			approved_by: string | null;
			cancelled_at: number | null;
		}>();
	if (!row) return { ok: false, reason: 'not_found' };
	if (row.requested_by === approvedBy) return { ok: false, reason: 'same_admin' };
	if (row.approved_by !== null || row.cancelled_at !== null) {
		return { ok: false, reason: 'not_pending' };
	}
	if ((await getVoterState(db, row.nim)) === 'already_voted') {
		return { ok: false, reason: 'already_voted' };
	}

	const code = generateCode(8);
	const updated = await db
		.prepare(
			`UPDATE exception_codes
			 SET approved_by = ?, approved_at = unixepoch(), code_hash = ?, expires_at = unixepoch() + ?
			 WHERE id = ? AND approved_by IS NULL AND cancelled_at IS NULL
			 RETURNING expires_at`
		)
		.bind(approvedBy, await hashCode(code), EXCEPTION_CODE_TTL, id)
		.first<{ expires_at: number }>();
	if (!updated) return { ok: false, reason: 'not_pending' };
	return { ok: true, nim: row.nim, code, expiresAt: updated.expires_at };
}

/** Batalkan pengajuan atau kode yang belum dipakai. */
export async function cancelException(db: D1Database, id: string): Promise<string | null> {
	const row = await db
		.prepare(
			`UPDATE exception_codes SET cancelled_at = unixepoch()
			 WHERE id = ? AND cancelled_at IS NULL AND used_at IS NULL
			 RETURNING nim`
		)
		.bind(id)
		.first<{ nim: string }>();
	return row?.nim ?? null;
}

/** Tukar kode pengecualian menjadi izin memilih (tanpa login Google). */
export async function redeemExceptionCode(db: D1Database, code: string): Promise<RedeemResult> {
	const codeHash = await hashCode(code);
	const VALID =
		'code_hash = ? AND used_at IS NULL AND cancelled_at IS NULL AND expires_at > unixepoch()';
	const row = await db
		.prepare(`SELECT nim FROM exception_codes WHERE ${VALID}`)
		.bind(codeHash)
		.first<{ nim: string }>();
	if (!row) return { ok: false, reason: 'invalid_code' };

	const state = await getVoterState(db, row.nim);
	if (state !== 'can_vote') return { ok: false, reason: state };

	const used = await db
		.prepare(`UPDATE exception_codes SET used_at = unixepoch() WHERE ${VALID} RETURNING nim`)
		.bind(codeHash)
		.first<{ nim: string }>();
	if (!used) return { ok: false, reason: 'invalid_code' };

	return { ok: true, nim: used.nim, ...(await issuePass(db, used.nim, 'exception')) };
}

/** NIM yang masuk lewat kode pengecualian; diumumkan setelah pemilihan ditutup. */
export async function usedExceptionNims(db: D1Database): Promise<string[]> {
	const { results } = await db
		.prepare('SELECT DISTINCT nim FROM exception_codes WHERE used_at IS NOT NULL ORDER BY nim')
		.all<{ nim: string }>();
	return results.map((r) => r.nim);
}

/** Opsi cookie izin memilih: httpOnly, hanya berlaku selama izinnya. */
export function passCookieOptions(expiresAt: number, url: URL) {
	return {
		...cookieBase(url),
		httpOnly: true,
		sameSite: 'lax' as const,
		maxAge: Math.max(1, expiresAt - Math.floor(Date.now() / 1000))
	};
}
