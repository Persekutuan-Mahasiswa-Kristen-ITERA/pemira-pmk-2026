import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { asD1, freshDb } from './testing/sqlite';
import { castVote, getVoterState } from './vote';

const ALICE = 'alice.122140001@student.itera.ac.id';
const BOB = 'bob.122140002@student.itera.ac.id';
const OUTSIDER = 'eve.122140099@student.itera.ac.id';

let raw: DatabaseSync;
let db: D1Database;

const count = (table: string) =>
	(raw.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

function setSchedule(opensOffset: number, closesOffset: number) {
	raw
		.prepare(
			'UPDATE election_config SET opens_at = unixepoch() + ?, closes_at = unixepoch() + ? WHERE id = 1'
		)
		.run(opensOffset, closesOffset);
}

beforeEach(() => {
	raw = freshDb();
	db = asD1(raw);
	raw.exec(`INSERT INTO candidates (id, number, name) VALUES (1, 1, 'Satu'), (2, 2, 'Dua')`);
	raw.prepare('INSERT INTO voters (email, name) VALUES (?, ?), (?, ?)').run(ALICE, 'A', BOB, 'B');
});

describe('getVoterState', () => {
	it('membedakan bukan pemilih, belum memilih, dan sudah memilih', async () => {
		setSchedule(-60, 3600);
		expect(await getVoterState(db, OUTSIDER)).toBe('not_eligible');
		expect(await getVoterState(db, ALICE)).toBe('can_vote');
		await castVote(db, ALICE, 1);
		expect(await getVoterState(db, ALICE)).toBe('already_voted');
	});
});

describe('castVote', () => {
	it('menyimpan suara dan mengembalikan kode tanda terima', async () => {
		setSchedule(-60, 3600);
		const result = await castVote(db, ALICE, 2);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/);
		expect(raw.prepare('SELECT code, candidate_id FROM ballots').all()).toEqual([
			{ code: result.code, candidate_id: 2 }
		]);
	});

	it('menolak suara kedua dari email yang sama', async () => {
		setSchedule(-60, 3600);
		await castVote(db, ALICE, 1);
		expect(await castVote(db, ALICE, 2)).toEqual({ ok: false, reason: 'already_voted' });
		expect(count('ballots')).toBe(1);
	});

	it('menolak di luar jendela pemilihan', async () => {
		setSchedule(3600, 7200);
		expect(await castVote(db, ALICE, 1)).toEqual({ ok: false, reason: 'voting_closed' });
	});

	it('menolak email di luar DPT', async () => {
		setSchedule(-60, 3600);
		expect(await castVote(db, OUTSIDER, 1)).toEqual({ ok: false, reason: 'not_eligible' });
	});

	it('menolak calon yang tidak ada tanpa menandai sudah memilih', async () => {
		setSchedule(-60, 3600);
		expect(await castVote(db, ALICE, 99)).toEqual({ ok: false, reason: 'invalid_candidate' });
		expect(count('voted')).toBe(0);
		expect(await castVote(db, ALICE, 1)).toMatchObject({ ok: true });
	});

	it('mengulang dengan kode baru jika kode bertabrakan', async () => {
		setSchedule(-60, 3600);
		await castVote(db, ALICE, 1, () => 'AAAAA-AAAAA');
		const codes = ['AAAAA-AAAAA', 'BBBBB-BBBBB'];
		const result = await castVote(db, BOB, 2, () => codes.shift()!);
		expect(result).toEqual({ ok: true, code: 'BBBBB-BBBBB' });
		expect(count('voted')).toBe(2);
		expect(count('ballots')).toBe(2);
	});
});
