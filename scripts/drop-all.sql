-- MENGHAPUS SELURUH DATA DAN SKEMA. Hanya untuk database STAGING / lokal
-- (dipakai oleh `pnpm db:reset:staging` dan `pnpm db:demo:local`). JANGAN dijalankan ke production.
-- Tabel yang punya FOREIGN KEY dihapus lebih dulu karena merujuk voters/candidates.
DROP TABLE IF EXISTS vote_passes;
DROP TABLE IF EXISTS exception_codes;
DROP TABLE IF EXISTS booth_codes;
DROP TABLE IF EXISTS officers;
DROP TABLE IF EXISTS candidate_photos;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS ballots;
DROP TABLE IF EXISTS voted;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS voters;
DROP TABLE IF EXISTS election_config;
DROP TABLE IF EXISTS d1_migrations;
