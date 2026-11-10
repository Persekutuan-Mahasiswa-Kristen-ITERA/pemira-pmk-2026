-- MENGHAPUS SELURUH DATA DAN SKEMA. Hanya untuk database STAGING / lokal
-- (dipakai oleh `pnpm db:reset:staging`). JANGAN dijalankan ke production.
DROP TABLE IF EXISTS ballots;
DROP TABLE IF EXISTS voted;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS voters;
DROP TABLE IF EXISTS election_config;
DROP TABLE IF EXISTS d1_migrations;
