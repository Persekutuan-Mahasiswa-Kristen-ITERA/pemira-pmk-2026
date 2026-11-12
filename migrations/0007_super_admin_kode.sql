-- Super admin boleh membuat kode pengecualian sendiri, tanpa persetujuan admin lain.
--
-- Sebelumnya setiap kode pengecualian wajib diajukan satu admin dan disetujui admin LAIN
-- (CHECK approved_by <> requested_by). Atas keputusan pemilik proyek, super admin
-- (secret `SUPER_ADMIN_EMAILS`) kini boleh langsung membuat kode. Baris seperti itu ditandai
-- `solo = 1`, dengan pengaju = penyetuju = super admin, dan langsung tersimpan dalam keadaan
-- disetujui (tidak pernah berstatus "menunggu").
--
-- Batasan yang tetap ditegakkan database:
--   - Baris biasa (`solo = 0`) tetap perlu dua admin berbeda.
--   - Baris `solo = 1` harus disisipkan sudah disetujui oleh pengajunya sendiri.
--   - Penanda `solo` tidak bisa diubah, jadi pengajuan biasa tidak bisa "disetujui sendiri"
--     dengan mengganti penandanya.
-- Database TIDAK tahu siapa super admin (daftarnya ada di secret), jadi pemeriksaan bahwa
-- pembuat baris `solo = 1` benar super admin dilakukan di aplikasi (`requireSuperAdmin`), dan
-- setiap kode tercatat di audit log.
--
-- SQLite tidak bisa mengubah CHECK, jadi tabel dibangun ulang dengan data dan trigger yang sama.

CREATE TABLE exception_codes_new (
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
	-- 1 = dibuat langsung oleh super admin tanpa admin kedua.
	solo INTEGER NOT NULL DEFAULT 0 CHECK (solo IN (0, 1)),
	-- Biasa: penyetuju tidak boleh sama dengan pengaju. Solo: pengaju sekaligus penyetuju.
	CHECK (
		approved_by IS NULL
		OR (solo = 0 AND approved_by <> requested_by)
		OR (solo = 1 AND approved_by = requested_by)
	),
	-- Kode solo tidak pernah berstatus menunggu.
	CHECK (solo = 0 OR approved_by IS NOT NULL),
	-- Kode hanya ada setelah disetujui, lengkap dengan waktu kedaluwarsa.
	CHECK (
		(approved_by IS NULL AND approved_at IS NULL AND code_hash IS NULL AND expires_at IS NULL)
		OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND code_hash IS NOT NULL
			AND expires_at IS NOT NULL)
	),
	CHECK (used_at IS NULL OR approved_by IS NOT NULL)
) WITHOUT ROWID;

INSERT INTO exception_codes_new
	(id, nim, reason, requested_by, requested_at, approved_by, approved_at, code_hash, expires_at,
	 used_at, cancelled_at)
SELECT id, nim, reason, requested_by, requested_at, approved_by, approved_at, code_hash, expires_at,
	used_at, cancelled_at
FROM exception_codes;

-- Trigger lama ikut terhapus bersama tabelnya.
DROP TABLE exception_codes;
ALTER TABLE exception_codes_new RENAME TO exception_codes;

CREATE TRIGGER exception_codes_require_open_window
BEFORE INSERT ON exception_codes
BEGIN
	SELECT RAISE(ABORT, 'voting_closed')
	WHERE NOT EXISTS (
		SELECT 1 FROM election_config
		WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at AND unixepoch() < closes_at
	);
END;

-- Setelah disetujui, NIM, alasan, para admin, dan penanda solo tidak bisa diubah; yang boleh
-- berubah hanya status pemakaian/pembatalan.
CREATE TRIGGER exception_codes_lock_identity
BEFORE UPDATE ON exception_codes
BEGIN
	SELECT RAISE(ABORT, 'exception_codes_immutable')
	WHERE NEW.id IS NOT OLD.id
		OR NEW.nim IS NOT OLD.nim
		OR NEW.reason IS NOT OLD.reason
		OR NEW.requested_by IS NOT OLD.requested_by
		OR NEW.requested_at IS NOT OLD.requested_at
		OR NEW.solo IS NOT OLD.solo
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
