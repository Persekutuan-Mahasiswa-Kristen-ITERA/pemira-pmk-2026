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
