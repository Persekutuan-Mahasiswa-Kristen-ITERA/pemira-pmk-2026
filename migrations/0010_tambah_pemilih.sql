-- Super admin boleh MENAMBAH pemilih ke DPT, termasuk saat pemungutan suara berlangsung.
--
-- Kasus: pada hari-H ada mahasiswa yang tidak tercantum di DPT hasil impor, padahal setelah dicek
-- panitia (di luar sistem, mis. ke data kampus) ia mahasiswa aktif dan beragama Kristen Protestan.
-- Sebelumnya trigger `voters_lock_insert` menolak SEMUA penambahan begitu pemilihan dibuka, dan kode
-- pengecualian pun tidak bisa dipakai karena hanya berlaku untuk NIM yang sudah ada di DPT.
--
-- Atas keputusan pemilik proyek (22 November 2026), aturannya menjadi:
--   - Penambahan dicatat di tabel `voter_additions` (NIM, nama, alasan/bukti pengecekan, oleh siapa,
--     kapan). Tabel ini hanya bisa ditambah: baris tidak bisa diubah atau dihapus.
--   - Saat pemilihan dibuka, baris baru di `voters` hanya diterima jika NIM yang sama tercatat di
--     `voter_additions` (keduanya disisipkan dalam satu batch oleh aplikasi).
--   - Setelah pemilihan ditutup, tidak ada penambahan apa pun.
--   - Mengubah atau menghapus pemilih tetap ditolak saat pemilihan dibuka (trigger lama tidak
--     disentuh).
-- Database TIDAK tahu siapa super admin (daftarnya ada di secret), jadi pemeriksaan bahwa penambah
-- adalah super admin dilakukan di aplikasi (`requireSuperAdmin`), dan setiap penambahan tercatat di
-- audit log.
--
-- Tabel ini hanya berisi identitas pemilih yang ditambahkan, tanpa hubungan apa pun ke surat suara.

CREATE TABLE voter_additions (
	id INTEGER PRIMARY KEY,
	nim TEXT NOT NULL
		CHECK (length(nim) BETWEEN 8 AND 12)
		CHECK (nim NOT GLOB '*[^0-9]*'),
	name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
	reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 300),
	added_by TEXT NOT NULL,
	added_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TRIGGER voter_additions_closed
BEFORE INSERT ON voter_additions
WHEN EXISTS (
	SELECT 1 FROM election_config
	WHERE opens_at IS NOT NULL AND closes_at IS NOT NULL AND unixepoch() >= closes_at
)
BEGIN
	SELECT RAISE(ABORT, 'voting_closed');
END;

CREATE TRIGGER voter_additions_no_update
BEFORE UPDATE ON voter_additions
BEGIN
	SELECT RAISE(ABORT, 'voter_additions_immutable');
END;

CREATE TRIGGER voter_additions_no_delete
BEFORE DELETE ON voter_additions
BEGIN
	SELECT RAISE(ABORT, 'voter_additions_immutable');
END;

-- Kunci DPT versi baru: saat pemilihan dibuka, hanya NIM yang tercatat di `voter_additions` yang boleh
-- masuk; setelah ditutup, tidak ada yang boleh masuk.
DROP TRIGGER voters_lock_insert;

CREATE TRIGGER voters_lock_insert
BEFORE INSERT ON voters
WHEN EXISTS (SELECT 1 FROM election_config WHERE opens_at IS NOT NULL AND unixepoch() >= opens_at)
BEGIN
	SELECT RAISE(ABORT, 'voters_locked')
	WHERE EXISTS (SELECT 1 FROM election_config WHERE unixepoch() >= closes_at)
		OR NOT EXISTS (SELECT 1 FROM voter_additions WHERE nim = NEW.nim);
END;
