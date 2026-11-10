import { beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { asD1, freshDb } from './testing/sqlite';
import { castVote } from './vote';
import { ballotsCsv, getParticipation, getTally, publishedBallots } from './results';

let raw: DatabaseSync;
let db: D1Database;

beforeEach(async () => {
	raw = freshDb();
	db = asD1(raw);
	raw.exec(
		`INSERT INTO candidates (id, number, name) VALUES (1, 1, 'Satu'), (2, 2, 'Dua'), (3, 3, 'Tiga')`
	);
	raw.exec(`INSERT INTO voters (nim, name) VALUES
		('100000001', 'A'), ('100000002', 'B'), ('100000003', 'C'), ('100000004', 'D')`);
	raw.exec(
		'UPDATE election_config SET opens_at = unixepoch() - 60, closes_at = unixepoch() + 3600'
	);
	await castVote(db, '100000001', 2, () => 'CCCCC-CCCCC');
	await castVote(db, '100000002', 1, () => 'AAAAA-AAAAA');
	await castVote(db, '100000003', 2, () => 'BBBBB-BBBBB');
});

describe('hasil', () => {
	it('menghitung partisipasi', async () => {
		expect(await getParticipation(db)).toEqual({ eligible: 4, voted: 3, ballots: 3 });
	});

	it('merekap suara termasuk calon tanpa suara', async () => {
		expect(await getTally(db)).toEqual([
			{ number: 1, name: 'Satu', votes: 1 },
			{ number: 2, name: 'Dua', votes: 2 },
			{ number: 3, name: 'Tiga', votes: 0 }
		]);
	});

	it('memublikasikan kode → nomor calon dalam urutan kode', async () => {
		const { ballots, csv, sha256 } = await publishedBallots(db);
		expect(ballots.map((b) => b.code)).toEqual(['AAAAA-AAAAA', 'BBBBB-BBBBB', 'CCCCC-CCCCC']);
		expect(csv).toBe('kode,nomor_calon\nAAAAA-AAAAA,1\nBBBBB-BBBBB,2\nCCCCC-CCCCC,2\n');
		expect(sha256).toMatch(/^[0-9a-f]{64}$/);
	});

	it('CSV kosong tetap punya baris judul', () => {
		expect(ballotsCsv([])).toBe('kode,nomor_calon\n');
	});
});
