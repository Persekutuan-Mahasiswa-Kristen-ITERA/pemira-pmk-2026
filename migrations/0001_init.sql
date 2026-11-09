-- Pemira PMK ITERA: skema awal.
--
-- Prinsip yang ditegakkan di level database (bukan hanya di kode aplikasi),
-- supaya bisa diaudit cukup dengan membaca berkas ini:
--
--   1. Identitas pemilih (`voted`) dan isi suara (`ballots`) disimpan terpisah,
--      tanpa kolom penghubung. `ballots` tidak punya timestamp dan tidak punya
--      rowid berurutan (WITHOUT ROWID + kunci acak), sehingga urutan atau waktu
--      penyimpanan tidak bisa dipakai untuk mencocokkan suara dengan pemilih.
--   2. Satu email hanya bisa tercatat sekali di `voted` (PRIMARY KEY). Aplikasi
--      menyimpan `voted` dan `ballots` dalam satu batch (transaksi) D1: jika
--      salah satu gagal, keduanya batal.
--   3. Suara hanya bisa masuk saat jendela pemilihan terbuka, dan hanya dari
--      email yang ada di DPT (`voters`).
--   4. Surat suara, catatan "sudah memilih", dan audit log tidak bisa diubah
--      atau dihapus.
--   5. Setelah pemilihan dibuka: DPT dan daftar calon terkunci, jadwal tidak
--      bisa diubah selain dipercepat penutupannya.
--
-- Semua waktu disimpan sebagai detik Unix (UTC).

-- ---------------------------------------------------------------------------
-- Konfigurasi pemilihan (tepat satu baris)
-- ---------------------------------------------------------------------------
CREATE TABLE election_config (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	title TEXT NOT NULL,
	opens_at INTEGER,
	closes_at INTEGER,
	CHECK (
		(opens_at IS NULL AND closes_at IS NULL)
		OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at > opens_at)
	)
);

INSERT INTO election_config (id, title) VALUES (1, 'Pemilihan Ketua PMK ITERA 2027');

-- Jendela pemilihan terbuka bila: unixepoch() >= opens_at AND unixepoch() < closes_at.

CREATE TRIGGER election_config_no_delete
BEFORE DELETE ON election_config
BEGIN
	SELECT RAISE(ABORT, 'election_config_immutable');
END;

-- Setelah pemilihan dibuka, jadwal hanya boleh diubah dengan memajukan
-- waktu tutup (tutup darurat), dan tidak boleh lebih awal dari saat ini.
CREATE TRIGGER election_config_lock_schedule
BEFORE UPDATE ON election_config
WHEN OLD.opens_at IS NOT NULL AND unixepoch() >= OLD.opens_at
BEGIN
	SELECT RAISE(ABORT, 'schedule_locked')
	WHERE NEW.opens_at IS NOT OLD.opens_at
		OR NEW.title IS NOT OLD.title
		OR NEW.closes_at > OLD.closes_at
		OR NEW.closes_at < unixepoch();
END;

-- ---------------------------------------------------------------------------
-- Calon
-- ---------------------------------------------------------------------------
CREATE TABLE candidates (
	id INTEGER PRIMARY KEY,
	number INTEGER NOT NULL UNIQUE CHECK (number > 0), -- nomor urut
	name TEXT NOT NULL,
	vision TEXT NOT NULL DEFAULT '',
	mission TEXT NOT NULL DEFAULT '',
	photo_url TEXT
);

CREATE TRIGGER candidates_lock_insert
BEFORE INSERT ON candidates
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'candidates_locked');
END;

CREATE TRIGGER candidates_lock_update
BEFORE UPDATE ON candidates
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'candidates_locked');
END;

CREATE TRIGGER candidates_lock_delete
BEFORE DELETE ON candidates
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'candidates_locked');
END;

-- ---------------------------------------------------------------------------
-- DPT (daftar pemilih tetap). Data ini TIDAK ada di repo; diimpor lewat wrangler.
-- ---------------------------------------------------------------------------
CREATE TABLE voters (
	email TEXT PRIMARY KEY
		CHECK (email = lower(trim(email)))
		CHECK (email LIKE '%_@student.itera.ac.id'),
	name TEXT NOT NULL
) WITHOUT ROWID;

CREATE TRIGGER voters_lock_insert
BEFORE INSERT ON voters
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'voters_locked');
END;

CREATE TRIGGER voters_lock_update
BEFORE UPDATE ON voters
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'voters_locked');
END;

CREATE TRIGGER voters_lock_delete
BEFORE DELETE ON voters
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'voters_locked');
END;

-- ---------------------------------------------------------------------------
-- Penanda "sudah memilih" (identitas, TANPA isi pilihan)
-- ---------------------------------------------------------------------------
CREATE TABLE voted (
	email TEXT PRIMARY KEY REFERENCES voters (email)
) WITHOUT ROWID;

CREATE TRIGGER voted_require_open_window
BEFORE INSERT ON voted
BEGIN
	SELECT RAISE(ABORT, 'voting_closed')
	WHERE NOT EXISTS (
		SELECT 1 FROM election_config
		WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at AND unixepoch() < closes_at
	);
	SELECT RAISE(ABORT, 'not_eligible')
	WHERE NOT EXISTS (SELECT 1 FROM voters WHERE email = NEW.email);
END;

CREATE TRIGGER voted_immutable_update
BEFORE UPDATE ON voted
BEGIN
	SELECT RAISE(ABORT, 'voted_immutable');
END;

CREATE TRIGGER voted_immutable_delete
BEFORE DELETE ON voted
BEGIN
	SELECT RAISE(ABORT, 'voted_immutable');
END;

-- ---------------------------------------------------------------------------
-- Surat suara anonim (isi pilihan, TANPA identitas, TANPA waktu)
-- `code` adalah kode tanda terima acak yang hanya ditampilkan ke pemilih.
-- ---------------------------------------------------------------------------
CREATE TABLE ballots (
	code TEXT PRIMARY KEY CHECK (length(code) >= 8),
	candidate_id INTEGER NOT NULL REFERENCES candidates (id)
) WITHOUT ROWID;

CREATE TRIGGER ballots_require_open_window
BEFORE INSERT ON ballots
BEGIN
	SELECT RAISE(ABORT, 'voting_closed')
	WHERE NOT EXISTS (
		SELECT 1 FROM election_config
		WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at AND unixepoch() < closes_at
	);
END;

CREATE TRIGGER ballots_immutable_update
BEFORE UPDATE ON ballots
BEGIN
	SELECT RAISE(ABORT, 'ballots_immutable');
END;

CREATE TRIGGER ballots_immutable_delete
BEFORE DELETE ON ballots
BEGIN
	SELECT RAISE(ABORT, 'ballots_immutable');
END;

-- ---------------------------------------------------------------------------
-- Audit log aksi admin (append-only). JANGAN PERNAH mencatat isi pilihan.
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	at INTEGER NOT NULL DEFAULT (unixepoch()),
	actor_email TEXT NOT NULL,
	action TEXT NOT NULL,
	detail TEXT -- JSON
);

CREATE TRIGGER audit_log_immutable_update
BEFORE UPDATE ON audit_log
BEGIN
	SELECT RAISE(ABORT, 'audit_log_immutable');
END;

CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON audit_log
BEGIN
	SELECT RAISE(ABORT, 'audit_log_immutable');
END;
