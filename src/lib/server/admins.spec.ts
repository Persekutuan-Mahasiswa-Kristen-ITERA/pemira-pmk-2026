import { beforeEach, describe, expect, it } from 'vitest';
import { getAdminRole, listAdmins, recordAdminLogin } from './admins';
import { asD1, freshDb } from './testing/sqlite';

const SUPERS = 'martin.manullang@if.itera.ac.id';

let db: D1Database;

beforeEach(() => {
	db = asD1(freshDb());
});

describe('getAdminRole', () => {
	it('super admin berasal dari secret, bukan database', async () => {
		expect(await getAdminRole(db, 'Martin.Manullang@if.itera.ac.id', SUPERS)).toBe('super');
		expect(await getAdminRole(db, 'martin.manullang@if.itera.ac.id', undefined)).toBeNull();
	});

	it('admin undangan dikenali dari tabel admins', async () => {
		await db
			.prepare('INSERT INTO admins (email, invited_by) VALUES (?, ?)')
			.bind('panitia@gmail.com', SUPERS)
			.run();
		expect(await getAdminRole(db, 'Panitia@Gmail.com', SUPERS)).toBe('admin');
		expect(await getAdminRole(db, 'orang.lain@gmail.com', SUPERS)).toBeNull();
	});

	it('admin yang dicabut langsung kehilangan peran', async () => {
		await db
			.prepare('INSERT INTO admins (email, invited_by) VALUES (?, ?)')
			.bind('panitia@gmail.com', SUPERS)
			.run();
		await db.prepare('DELETE FROM admins WHERE email = ?').bind('panitia@gmail.com').run();
		expect(await getAdminRole(db, 'panitia@gmail.com', SUPERS)).toBeNull();
	});
});

describe('listAdmins', () => {
	it('menampilkan super admin dulu, lalu admin undangan beserta waktu masuk', async () => {
		await db
			.prepare('INSERT INTO admins (email, invited_by) VALUES (?, ?)')
			.bind('panitia@gmail.com', SUPERS)
			.run();
		await recordAdminLogin(db, 'Panitia@gmail.com').run();

		const admins = await listAdmins(db, SUPERS);
		expect(admins.map((a) => [a.email, a.role])).toEqual([
			[SUPERS, 'super'],
			['panitia@gmail.com', 'admin']
		]);
		expect(admins[1].invitedBy).toBe(SUPERS);
		expect(admins[1].lastLoginAt).toBeTypeOf('number');
	});
});
