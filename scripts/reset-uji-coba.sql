-- RESET UJI COBA PUBLIK: menghapus data PEMILIHAN hasil uji coba, mematikan pita uji coba.
-- Jalankan lewat `pnpm db:reset:uji-coba <local|staging|production>` (scripts/reset-uji-coba.mjs),
-- yang mencatat bookmark Time Travel, mengarsipkan audit log, lalu memverifikasi hasilnya.
--
-- DIHAPUS : surat suara, tanda sudah memilih, izin memilih, kode TPS, kode pengecualian, audit log;
--           jadwal dikosongkan (sehingga calon dan DPT bisa diubah lagi), audit publik ditutup.
-- DIPERTAHANKAN: calon (profil, visi-misi, foto), DPT, admin, Petugas TPS, judul pemilihan.
--
-- Beberapa tabel dijaga trigger "tidak boleh dihapus". Trigger itu dilepas sebentar lalu dibuat
-- ulang dengan teks yang SAMA PERSIS dengan migrasi terakhir (diuji di reset-uji-coba.spec.ts).

-- Penjaga: hanya boleh berjalan selama mode uji coba publik menyala. Reset mematikan flag itu,
-- jadi skrip ini tidak bisa dijalankan dua kali, apalagi saat pemilihan resmi.
DROP TABLE IF EXISTS _guard_public_test;
CREATE TABLE _guard_public_test (n INTEGER CHECK (n = 1));
INSERT INTO _guard_public_test SELECT public_test FROM election_config WHERE id = 1;
DROP TABLE _guard_public_test;

-- Izin memilih (tanpa trigger hapus)
DELETE FROM vote_passes;

-- Kode pengecualian
DROP TRIGGER exception_codes_no_delete;
DELETE FROM exception_codes;
CREATE TRIGGER exception_codes_no_delete
BEFORE DELETE ON exception_codes
BEGIN
	SELECT RAISE(ABORT, 'exception_codes_immutable');
END;

-- Kode TPS
DROP TRIGGER booth_codes_no_delete;
DELETE FROM booth_codes;
CREATE TRIGGER booth_codes_no_delete
BEFORE DELETE ON booth_codes
BEGIN
	SELECT RAISE(ABORT, 'booth_codes_immutable');
END;

-- Surat suara
DROP TRIGGER ballots_immutable_delete;
DELETE FROM ballots;
CREATE TRIGGER ballots_immutable_delete
BEFORE DELETE ON ballots
BEGIN
	SELECT RAISE(ABORT, 'ballots_immutable');
END;

-- Tanda sudah memilih
DROP TRIGGER voted_immutable_delete;
DELETE FROM voted;
CREATE TRIGGER voted_immutable_delete
BEFORE DELETE ON voted
BEGIN
	SELECT RAISE(ABORT, 'voted_immutable');
END;

-- Audit log (sudah diarsipkan ke data/ oleh reset-uji-coba.mjs sebelum skrip ini berjalan)
DROP TRIGGER audit_log_immutable_delete;
DELETE FROM audit_log;
CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON audit_log
BEGIN
	SELECT RAISE(ABORT, 'audit_log_immutable');
END;

-- Jadwal dan flag. Trigger kunci jadwal (versi migrations/0005_audit_publik.sql) dilepas sebentar
-- karena jadwal uji yang sudah dibuka tidak boleh diubah oleh aplikasi.
DROP TRIGGER election_config_lock_schedule;
UPDATE election_config
SET opens_at = NULL, closes_at = NULL, audit_public = 0, public_test = 0
WHERE id = 1;
CREATE TRIGGER election_config_lock_schedule
BEFORE UPDATE ON election_config
WHEN OLD.opens_at IS NOT NULL AND unixepoch() >= OLD.opens_at
BEGIN
	SELECT RAISE(ABORT, 'schedule_locked')
	WHERE NEW.opens_at IS NOT OLD.opens_at
		OR NEW.title IS NOT OLD.title
		OR NEW.closes_at > OLD.closes_at
		OR (NEW.closes_at IS NOT OLD.closes_at AND NEW.closes_at < unixepoch());
END;

-- Entri pertama audit log setelah reset
INSERT INTO audit_log (actor_email, action, detail)
VALUES ('sistem', 'reset_uji_coba_publik', '{"catatan":"data pemilihan uji coba publik dihapus"}');
