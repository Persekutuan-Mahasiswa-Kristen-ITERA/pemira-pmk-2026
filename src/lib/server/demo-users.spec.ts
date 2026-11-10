import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { nimFromEmail } from './access';
import { DEMO_SUPER_ADMIN, demoStudentEmail, listDemoUsers, parseDemoEmail } from './demo-users';
import { asD1, freshDb } from './testing/sqlite';

const SEED = readFileSync(new URL('../../../scripts/seed-demo.sql', import.meta.url), 'utf8');

let db: D1Database;

beforeEach(() => {
	const raw = freshDb();
	raw.exec(SEED);
	db = asD1(raw);
});

describe('seed-demo.sql', () => {
	it('lolos semua trigger dan menjaga invarian sudah memilih = surat suara', async () => {
		const row = await db
			.prepare(
				`SELECT (SELECT count(*) FROM voters) AS voters,
				        (SELECT count(*) FROM voted) AS voted,
				        (SELECT count(*) FROM ballots) AS ballots,
				        (SELECT count(*) FROM vote_passes) AS passes`
			)
			.first<{ voters: number; voted: number; ballots: number; passes: number }>();
		expect(row).toEqual({ voters: 40, voted: 18, ballots: 18, passes: 0 });
	});
});

describe('listDemoUsers', () => {
	it('memuat super admin demo, admin, petugas, pemilih DPT, dan akun penolakan', async () => {
		const users = await listDemoUsers(db);
		expect(users[0]).toMatchObject({ email: DEMO_SUPER_ADMIN, group: 'super' });
		expect(users.filter((u) => u.group === 'admin')).toHaveLength(2);
		expect(users.filter((u) => u.group === 'officer')).toHaveLength(3);
		expect(users.filter((u) => u.group === 'outsider')).toHaveLength(2);

		const voters = users.filter((u) => u.group === 'voter');
		expect(voters).toHaveLength(40);
		// Setiap email pemilih dummy harus kembali ke NIM yang ada di DPT.
		for (const voter of voters) {
			const nim = nimFromEmail(voter.email);
			expect(nim).not.toBeNull();
			const found = await db.prepare('SELECT 1 FROM voters WHERE nim = ?').bind(nim).first();
			expect(found).not.toBeNull();
		}
	});
});

describe('demoStudentEmail / parseDemoEmail', () => {
	it('membentuk email kampus dari nama depan dan NIM', () => {
		expect(demoStudentEmail('Élisabeth Hutagalung', '121140001')).toBe(
			'elisabeth.121140001@student.itera.ac.id'
		);
		expect(demoStudentEmail('', '121140001')).toBe('mahasiswa.121140001@student.itera.ac.id');
	});

	it('menerima email wajar saja', () => {
		expect(parseDemoEmail('  Admin.Satu@Example.com ')).toBe('admin.satu@example.com');
		expect(parseDemoEmail('bukan email')).toBeNull();
	});
});
