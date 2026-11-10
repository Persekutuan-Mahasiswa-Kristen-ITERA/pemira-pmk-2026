-- Admin yang diundang dan foto calon.
--
-- Admin: super admin ditentukan oleh secret `SUPER_ADMIN_EMAILS` (bukan di database), dan
-- hanya super admin yang bisa menambah atau mencabut baris di tabel `admins`. Setiap undangan
-- dan pencabutan dicatat di audit log oleh aplikasi dalam batch yang sama.
--
-- Foto calon disimpan di D1 (gambar kecil yang sudah diperkecil di browser), dan mengikuti
-- aturan kunci yang sama dengan tabel `candidates`: tidak bisa diubah setelah pemilihan dibuka.

-- ---------------------------------------------------------------------------
-- Admin yang diundang super admin
-- ---------------------------------------------------------------------------
CREATE TABLE admins (
	email TEXT PRIMARY KEY
		CHECK (email = lower(trim(email)))
		CHECK (email LIKE '%_@_%._%'),
	invited_by TEXT NOT NULL,
	invited_at INTEGER NOT NULL DEFAULT (unixepoch()),
	last_login_at INTEGER
) WITHOUT ROWID;

-- ---------------------------------------------------------------------------
-- Foto calon
-- ---------------------------------------------------------------------------
CREATE TABLE candidate_photos (
	candidate_id INTEGER PRIMARY KEY REFERENCES candidates (id) ON DELETE CASCADE,
	mime TEXT NOT NULL CHECK (mime IN ('image/webp', 'image/jpeg', 'image/png')),
	data BLOB NOT NULL CHECK (length(data) BETWEEN 1 AND 1000000),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TRIGGER candidate_photos_lock_insert
BEFORE INSERT ON candidate_photos
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'candidates_locked');
END;

CREATE TRIGGER candidate_photos_lock_update
BEFORE UPDATE ON candidate_photos
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'candidates_locked');
END;

CREATE TRIGGER candidate_photos_lock_delete
BEFORE DELETE ON candidate_photos
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'candidates_locked');
END;

-- Kolom lama yang tidak pernah dipakai; foto sekarang ada di `candidate_photos`.
ALTER TABLE candidates DROP COLUMN photo_url;
