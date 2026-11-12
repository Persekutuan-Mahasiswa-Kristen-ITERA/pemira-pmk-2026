import { describe, expect, it } from 'vitest';
import { canMakeBoothCodes, requireAdmin, requireOfficer, requireSuperAdmin } from './admin';

const user = { email: 'orang@itera.ac.id', name: null, expiresAt: 0 };

function locals(role: App.Locals['role'], officer: boolean, loggedIn = true): App.Locals {
	return { user: loggedIn ? user : null, role, officer, pass: null };
}

/** Status HTTP dari error/redirect SvelteKit yang dilempar, atau null jika lolos. */
function statusOf(fn: () => unknown): number | null {
	try {
		fn();
		return null;
	} catch (err) {
		return (err as { status: number }).status;
	}
}

describe('otorisasi peran', () => {
	it('kode TPS: Petugas TPS dan super admin boleh, admin biasa dan pemilih tidak', () => {
		expect(canMakeBoothCodes(locals(null, true))).toBe(true);
		expect(canMakeBoothCodes(locals('super', false))).toBe(true);
		expect(canMakeBoothCodes(locals('admin', false))).toBe(false);
		expect(canMakeBoothCodes(locals(null, false))).toBe(false);

		expect(statusOf(() => requireOfficer(locals(null, true)))).toBeNull();
		expect(statusOf(() => requireOfficer(locals('super', false)))).toBeNull();
		expect(statusOf(() => requireOfficer(locals('admin', false)))).toBe(403);
		expect(statusOf(() => requireOfficer(locals(null, false)))).toBe(403);
		expect(statusOf(() => requireOfficer(locals('super', false, false)))).toBe(303);
	});

	it('kode pengecualian langsung: hanya super admin', () => {
		expect(statusOf(() => requireSuperAdmin(locals('super', false)))).toBeNull();
		expect(statusOf(() => requireSuperAdmin(locals('admin', true)))).toBe(403);
		expect(statusOf(() => requireSuperAdmin(locals(null, true)))).toBe(403);
	});

	it('Petugas TPS tetap tidak bisa membuka panel admin', () => {
		expect(statusOf(() => requireAdmin(locals(null, true)))).toBe(403);
	});
});
