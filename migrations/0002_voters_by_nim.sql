-- DPT dicocokkan berdasarkan NIM, bukan email lengkap.
--
-- Alasan: data DPT dari kampus tidak selalu memuat email (mis. angkatan tertentu kosong),
-- sedangkan NIM selalu ada. Email login berformat `nama.nim@student.itera.ac.id` dan
-- dibuat oleh kampus, jadi NIM di dalamnya dapat dipercaya. Aplikasi mengambil NIM dari
-- email yang sudah diverifikasi Google, lalu mencocokkannya ke tabel `voters`.
--
-- Tabel `voters` dan `voted` dibuat ulang dengan kunci NIM. Migrasi ini hanya boleh
-- berjalan sebelum ada suara masuk: jika tabel `voted` sudah berisi, migrasi gagal
-- (CHECK di bawah) dan seluruh berkas dibatalkan.

CREATE TABLE _guard_no_votes_yet (n INTEGER CHECK (n = 0));
INSERT INTO _guard_no_votes_yet SELECT count(*) FROM voted;
DROP TABLE _guard_no_votes_yet;

-- DROP TABLE ikut menghapus trigger tabel tersebut tanpa menjalankannya.
DROP TABLE voted;
DROP TABLE voters;

-- ---------------------------------------------------------------------------
-- DPT (daftar pemilih tetap). Data ini TIDAK ada di repo; diimpor panitia lewat /admin/dpt.
-- Hanya NIM dan nama yang disimpan (data seminimal mungkin).
-- ---------------------------------------------------------------------------
CREATE TABLE voters (
	nim TEXT PRIMARY KEY
		CHECK (length(nim) BETWEEN 8 AND 12)
		CHECK (nim NOT GLOB '*[^0-9]*'),
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
-- Penanda "sudah memilih" (identitas, TANPA isi pilihan). Satu NIM satu suara,
-- apa pun variasi email yang dipakai untuk login.
-- ---------------------------------------------------------------------------
CREATE TABLE voted (
	nim TEXT PRIMARY KEY REFERENCES voters (nim)
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
	WHERE NOT EXISTS (SELECT 1 FROM voters WHERE nim = NEW.nim);
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
