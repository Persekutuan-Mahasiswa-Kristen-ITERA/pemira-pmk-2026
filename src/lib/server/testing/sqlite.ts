/**
 * Utilitas tes: database SQLite di memori dengan migrasi yang sama seperti D1,
 * plus pembungkus minimal yang meniru API D1 (prepare/bind/first/all/run/batch).
 */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

export function freshDb(): DatabaseSync {
	const db = new DatabaseSync(':memory:');
	db.exec('PRAGMA foreign_keys = ON;'); // D1 menegakkan foreign key secara default
	for (const file of readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort()) {
		db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
	}
	return db;
}

class Statement {
	constructor(
		private readonly db: DatabaseSync,
		private readonly sql: string,
		private readonly params: SQLInputValue[] = []
	) {}

	bind(...params: SQLInputValue[]) {
		return new Statement(this.db, this.sql, params);
	}

	async first<T>() {
		return (this.db.prepare(this.sql).get(...this.params) ?? null) as T | null;
	}

	async all<T>() {
		return { results: this.db.prepare(this.sql).all(...this.params) as T[], success: true };
	}

	async run() {
		this.runSync();
		return { success: true };
	}

	runSync() {
		this.db.prepare(this.sql).run(...this.params);
	}
}

export function asD1(db: DatabaseSync): D1Database {
	const d1 = {
		prepare: (sql: string) => new Statement(db, sql),
		async batch(statements: Statement[]) {
			db.exec('BEGIN');
			try {
				for (const s of statements) s.runSync();
				db.exec('COMMIT');
			} catch (err) {
				db.exec('ROLLBACK');
				throw err;
			}
			return statements.map(() => ({ success: true }));
		}
	};
	return d1 as unknown as D1Database;
}

/** Beri izin memilih (seperti setelah kode TPS diterima) supaya tes bisa menyimpan suara. */
export function grantPass(db: DatabaseSync, nim: string, seconds = 300) {
	db.prepare(
		`INSERT INTO vote_passes (nim, session_hash, via, expires_at)
		 VALUES (?1, lower(hex(randomblob(32))), 'tps', unixepoch() + ?2)
		 ON CONFLICT (nim) DO UPDATE SET expires_at = excluded.expires_at`
	).run(nim, seconds);
}
