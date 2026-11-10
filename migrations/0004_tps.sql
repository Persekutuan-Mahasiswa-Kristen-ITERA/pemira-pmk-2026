-- Pemungutan suara wajib di TPS.
--
-- Pemilih hanya bisa memilih setelah mendapat "izin memilih" (`vote_passes`) yang berlaku
-- beberapa menit. Izin itu hanya bisa didapat dengan salah satu cara:
--
--   1. Kode TPS (`booth_codes`): dibuat Petugas TPS setelah memeriksa KTM pemilih di TPS,
--      sekali pakai, berlaku 2 menit. Kode TIDAK dikaitkan ke NIM. Pemilih tetap login
--      Google dengan akunnya sendiri, jadi petugas tidak bisa memilih atas nama orang lain.
--   2. Kode pengecualian (`exception_codes`): untuk pemilih yang benar-benar tidak bisa login
--      Google. Kode terikat ke satu NIM, diajukan satu admin dan disetujui admin LAIN.
--      Setelah pemilihan ditutup, daftar NIM yang memakai jalur ini diumumkan.
--
-- Izin dihapus otomatis begitu suara masuk. Izin hanya memuat NIM, tidak pernah isi pilihan,
-- dan tidak ada kolom yang menghubungkan kode atau izin dengan surat suara.

-- ---------------------------------------------------------------------------
-- Petugas TPS (diundang super admin). Petugas hanya bisa membuat kode TPS.
-- ---------------------------------------------------------------------------
CREATE TABLE officers (
	email TEXT PRIMARY KEY
		CHECK (email = lower(trim(email)))
		CHECK (email LIKE '%_@_%._%'),
	invited_by TEXT NOT NULL,
	invited_at INTEGER NOT NULL DEFAULT (unixepoch()),
	last_login_at INTEGER
) WITHOUT ROWID;

-- ---------------------------------------------------------------------------
-- Kode TPS. Yang disimpan hanya hash SHA-256 kodenya.
-- ---------------------------------------------------------------------------
CREATE TABLE booth_codes (
	code_hash TEXT PRIMARY KEY CHECK (length(code_hash) = 64),
	created_by TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	expires_at INTEGER NOT NULL,
	used_at INTEGER,
	CHECK (expires_at > created_at AND expires_at <= created_at + 600)
) WITHOUT ROWID;

CREATE TRIGGER booth_codes_require_open_window
BEFORE INSERT ON booth_codes
BEGIN
	SELECT RAISE(ABORT, 'voting_closed')
	WHERE NOT EXISTS (
		SELECT 1 FROM election_config
		WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at AND unixepoch() < closes_at
	);
END;

-- Yang boleh berubah hanya penanda pemakaian, dan hanya sekali.
CREATE TRIGGER booth_codes_lock_update
BEFORE UPDATE ON booth_codes
BEGIN
	SELECT RAISE(ABORT, 'booth_codes_immutable')
	WHERE NEW.code_hash IS NOT OLD.code_hash
		OR NEW.created_by IS NOT OLD.created_by
		OR NEW.created_at IS NOT OLD.created_at
		OR NEW.expires_at IS NOT OLD.expires_at
		OR OLD.used_at IS NOT NULL;
END;

CREATE TRIGGER booth_codes_no_delete
BEFORE DELETE ON booth_codes
BEGIN
	SELECT RAISE(ABORT, 'booth_codes_immutable');
END;

-- ---------------------------------------------------------------------------
-- Kode pengecualian (tanpa login Google), terikat ke satu NIM, perlu dua admin berbeda.
-- ---------------------------------------------------------------------------
CREATE TABLE exception_codes (
	id TEXT PRIMARY KEY,
	nim TEXT NOT NULL REFERENCES voters (nim),
	reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 300),
	requested_by TEXT NOT NULL,
	requested_at INTEGER NOT NULL DEFAULT (unixepoch()),
	approved_by TEXT,
	approved_at INTEGER,
	code_hash TEXT UNIQUE CHECK (code_hash IS NULL OR length(code_hash) = 64),
	expires_at INTEGER,
	used_at INTEGER,
	cancelled_at INTEGER,
	-- Penyetuju tidak boleh sama dengan pengaju.
	CHECK (approved_by IS NULL OR approved_by <> requested_by),
	-- Kode hanya ada setelah disetujui, lengkap dengan waktu kedaluwarsa.
	CHECK (
		(approved_by IS NULL AND approved_at IS NULL AND code_hash IS NULL AND expires_at IS NULL)
		OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND code_hash IS NOT NULL
			AND expires_at IS NOT NULL)
	),
	CHECK (used_at IS NULL OR approved_by IS NOT NULL)
) WITHOUT ROWID;

CREATE TRIGGER exception_codes_require_open_window
BEFORE INSERT ON exception_codes
BEGIN
	SELECT RAISE(ABORT, 'voting_closed')
	WHERE NOT EXISTS (
		SELECT 1 FROM election_config
		WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at AND unixepoch() < closes_at
	);
END;

-- Setelah disetujui, NIM, alasan, dan para admin tidak bisa diubah; yang boleh berubah
-- hanya status pemakaian/pembatalan.
CREATE TRIGGER exception_codes_lock_identity
BEFORE UPDATE ON exception_codes
BEGIN
	SELECT RAISE(ABORT, 'exception_codes_immutable')
	WHERE NEW.id IS NOT OLD.id
		OR NEW.nim IS NOT OLD.nim
		OR NEW.reason IS NOT OLD.reason
		OR NEW.requested_by IS NOT OLD.requested_by
		OR NEW.requested_at IS NOT OLD.requested_at
		OR (OLD.approved_by IS NOT NULL AND (
			NEW.approved_by IS NOT OLD.approved_by
			OR NEW.approved_at IS NOT OLD.approved_at
			OR NEW.code_hash IS NOT OLD.code_hash
			OR NEW.expires_at IS NOT OLD.expires_at))
		OR (OLD.used_at IS NOT NULL AND NEW.used_at IS NOT OLD.used_at);
END;

CREATE TRIGGER exception_codes_no_delete
BEFORE DELETE ON exception_codes
BEGIN
	SELECT RAISE(ABORT, 'exception_codes_immutable');
END;

-- ---------------------------------------------------------------------------
-- Izin memilih: satu baris per NIM, berlaku beberapa menit, dihapus begitu suara masuk.
-- `session_hash` adalah hash token acak di cookie perangkat pemilih.
-- ---------------------------------------------------------------------------
CREATE TABLE vote_passes (
	nim TEXT PRIMARY KEY REFERENCES voters (nim),
	session_hash TEXT NOT NULL UNIQUE CHECK (length(session_hash) = 64),
	via TEXT NOT NULL CHECK (via IN ('tps', 'exception')),
	expires_at INTEGER NOT NULL
) WITHOUT ROWID;

-- Aturan suara diganti: selain jendela waktu dan DPT, kini wajib ada izin memilih yang
-- masih berlaku. Ditulis dalam satu trigger supaya urutan pesan penolakannya pasti.
DROP TRIGGER voted_require_open_window;

CREATE TRIGGER voted_require_open_window
BEFORE INSERT ON voted
BEGIN
	SELECT RAISE(ABORT, 'voting_closed')
	WHERE NOT EXISTS (
		SELECT 1 FROM election_config
		WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at AND unixepoch() < closes_at
	);
	SELECT RAISE(ABORT, 'not_eligible')
	WHERE NOT EXISTS (SELECT 1 FROM voters WHERE nim = NEW.nim);
	SELECT RAISE(ABORT, 'no_pass')
	WHERE NOT EXISTS (
		SELECT 1 FROM vote_passes WHERE nim = NEW.nim AND expires_at > unixepoch()
	);
END;

CREATE TRIGGER voted_consume_pass
AFTER INSERT ON voted
BEGIN
	DELETE FROM vote_passes WHERE nim = NEW.nim;
END;
