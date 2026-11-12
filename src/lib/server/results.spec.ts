import { beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { asD1, freshDb, grantPass } from './testing/sqlite';
import { castVote } from './vote';
import {
	approveResultsStatement,
	ballotsCsv,
	findBallot,
	getParticipation,
	getResultsRelease,
	getTally,
	isAuditPublic,
	isPublished,
	publishedBallots,
	resultsVisible,
	setAuditPublicStatement,
	setResultsDetailStatement,
	setResultsModeStatement,
	showsCounts,
	shownTally,
	type ResultsRelease
} from './results';

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
	for (const nim of ['100000001', '100000002', '100000003']) grantPass(raw, nim);
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

describe('audit suara publik', () => {
	it('tertutup secara bawaan', async () => {
		expect(await isAuditPublic(db)).toBe(false);
	});

	it('bisa dibuka dan ditutup lagi oleh admin, termasuk setelah pemilihan ditutup', async () => {
		raw.exec('UPDATE election_config SET closes_at = unixepoch() WHERE id = 1');
		await setAuditPublicStatement(db, true).run();
		expect(await isAuditPublic(db)).toBe(true);
		await setAuditPublicStatement(db, false).run();
		expect(await isAuditPublic(db)).toBe(false);
	});

	it('tidak mengubah jadwal atau suara', async () => {
		const before = raw.prepare('SELECT opens_at, closes_at FROM election_config').get();
		await setAuditPublicStatement(db, true).run();
		expect(raw.prepare('SELECT opens_at, closes_at FROM election_config').get()).toEqual(before);
		expect(await getParticipation(db)).toEqual({ eligible: 4, voted: 3, ballots: 3 });
	});
});

describe('publikasi hasil', () => {
	const a = (email: string, solo = false) => ({ email, approvedAt: 0, solo });
	const release = (mode: 'auto' | 'manual', published = false): ResultsRelease => ({
		mode,
		detail: 'counts',
		approvals: [],
		published
	});

	it('dipublikasikan oleh dua admin berbeda atau satu super admin', () => {
		expect(isPublished([])).toBe(false);
		expect(isPublished([a('x@x.id')])).toBe(false);
		expect(isPublished([a('x@x.id'), a('y@x.id')])).toBe(true);
		expect(isPublished([a('super@x.id', true)])).toBe(true);
	});

	it('hasil tidak pernah tampil sebelum ditutup, apa pun modenya', () => {
		for (const phase of ['unscheduled', 'upcoming', 'open'] as const) {
			expect(resultsVisible(phase, release('auto'))).toBe(false);
			expect(resultsVisible(phase, release('manual', true))).toBe(false);
		}
	});

	it('setelah ditutup: otomatis langsung tampil, mode tombol menunggu publikasi', () => {
		expect(resultsVisible('closed', release('auto'))).toBe(true);
		expect(resultsVisible('closed', release('manual'))).toBe(false);
		expect(resultsVisible('closed', release('manual', true))).toBe(true);
	});

	it('membaca mode dan persetujuan dari database', async () => {
		expect(await getResultsRelease(db)).toEqual({
			mode: 'auto',
			detail: 'counts',
			approvals: [],
			published: false
		});

		await setResultsModeStatement(db, 'manual').run();
		raw.exec('UPDATE election_config SET closes_at = unixepoch()'); // tutup darurat
		await approveResultsStatement(db, 'admin1@x.id', false).run();
		let r = await getResultsRelease(db);
		expect(r.mode).toBe('manual');
		expect(r.approvals.map((x) => [x.email, x.solo])).toEqual([['admin1@x.id', false]]);
		expect(r.published).toBe(false);
		expect(resultsVisible('closed', r)).toBe(false);

		await approveResultsStatement(db, 'admin2@x.id', false).run();
		r = await getResultsRelease(db);
		expect(r.published).toBe(true);
		expect(resultsVisible('closed', r)).toBe(true);
	});

	it('super admin mempublikasikan sendiri', async () => {
		await setResultsModeStatement(db, 'manual').run();
		raw.exec('UPDATE election_config SET closes_at = unixepoch()'); // tutup darurat
		await approveResultsStatement(db, 'super@x.id', true).run();
		expect((await getResultsRelease(db)).published).toBe(true);
	});
});

describe('rincian hasil (persentase saja)', () => {
	const row = (number: number, votes: number) => ({ number, name: `C${number}`, votes });

	it('bawaan jumlah suara; bisa diubah ke persentase saja dan kembali', async () => {
		expect((await getResultsRelease(db)).detail).toBe('counts');
		await setResultsDetailStatement(db, 'percent').run();
		raw.exec('UPDATE election_config SET closes_at = unixepoch()'); // tutup darurat
		expect((await getResultsRelease(db)).detail).toBe('percent');
		await setResultsDetailStatement(db, 'counts').run();
		expect((await getResultsRelease(db)).detail).toBe('counts');
	});

	it('publik hanya melihat angka pada mode jumlah suara; admin selalu', () => {
		expect(showsCounts('counts', false)).toBe(true);
		expect(showsCounts('percent', false)).toBe(false);
		expect(showsCounts('percent', true)).toBe(true);
	});

	it('persentase saja tidak memuat jumlah suara', async () => {
		const shown = shownTally(await getTally(db), false);
		expect(shown).toEqual([
			{ number: 1, name: 'Satu', percent: 33.3, votes: null, top: false },
			{ number: 2, name: 'Dua', percent: 66.7, votes: null, top: true },
			{ number: 3, name: 'Tiga', percent: 0, votes: null, top: false }
		]);
		expect(JSON.stringify(shown)).not.toMatch(/"votes":\d/);
	});

	it('dengan jumlah suara tetap memuat angka', async () => {
		expect(shownTally(await getTally(db), true).map((r) => r.votes)).toEqual([1, 2, 0]);
	});

	it('persentase dibulatkan 0,1% dan jumlahnya tepat 100', () => {
		const sum = (rows: { percent: number }[]) =>
			Math.round(rows.reduce((s, r) => s + r.percent, 0) * 10) / 10;
		const thirds = shownTally([row(1, 1), row(2, 1), row(3, 1)], false);
		expect(thirds.map((r) => r.percent)).toEqual([33.4, 33.3, 33.3]);
		expect(sum(thirds)).toBe(100);
		expect(thirds.every((r) => r.top)).toBe(true); // seri
		for (const votes of [
			[1234, 987],
			[7, 0, 3],
			[2001, 1999, 500]
		]) {
			expect(
				sum(
					shownTally(
						votes.map((v, i) => row(i + 1, v)),
						false
					)
				)
			).toBe(100);
		}
	});

	it('tanpa suara: semua 0% dan tidak ada yang terbanyak', () => {
		expect(shownTally([row(1, 0), row(2, 0)], false)).toEqual([
			{ number: 1, name: 'C1', percent: 0, votes: null, top: false },
			{ number: 2, name: 'C2', percent: 0, votes: null, top: false }
		]);
	});

	it('mencari satu kode tanda terima', async () => {
		expect(await findBallot(db, 'BBBBB-BBBBB')).toBe(2);
		expect(await findBallot(db, 'AAAAA-AAAAA')).toBe(1);
		expect(await findBallot(db, 'ZZZZZ-ZZZZZ')).toBeNull();
	});
});
