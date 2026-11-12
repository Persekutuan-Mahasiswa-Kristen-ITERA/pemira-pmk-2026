-- Publikasi hasil: otomatis saat ditutup, atau menunggu tombol "Publikasikan hasil".
--
-- Atas keputusan pemilik proyek (12 November 2026):
--   - `results_mode = 'auto'` (bawaan, perilaku lama): begitu pemungutan suara ditutup, perolehan
--     suara langsung tampil ke publik.
--   - `results_mode = 'manual'`: setelah ditutup, perolehan suara (dan bagian audit) TIDAK tampil
--     kepada siapa pun, termasuk admin, sampai hasil dipublikasikan. Publikasi butuh persetujuan
--     dua admin berbeda, atau satu super admin sendiri (`solo = 1`).
--   - Super admin boleh mengubah mode kapan saja (kolom ini sengaja tidak dikunci trigger
--     `election_config_lock_schedule`). Setiap perubahan dicatat aplikasi di audit log.
--
-- Persetujuan disimpan di `results_approvals`, satu baris per admin, tidak bisa diubah atau
-- dihapus. "Sudah dipublikasikan" = ada dua baris atau lebih, atau ada baris solo. Karena barisnya
-- permanen, publikasi tidak bisa dibatalkan.
--
-- Database TIDAK tahu siapa super admin (daftarnya ada di secret), jadi pemeriksaan bahwa pembuat
-- baris `solo = 1` benar super admin dilakukan di aplikasi (`requireSuperAdmin`), seperti kode
-- pengecualian solo (migrasi 0007).

ALTER TABLE election_config
	ADD COLUMN results_mode TEXT NOT NULL DEFAULT 'auto' CHECK (results_mode IN ('auto', 'manual'));

CREATE TABLE results_approvals (
	admin_email TEXT PRIMARY KEY,
	approved_at INTEGER NOT NULL DEFAULT (unixepoch()),
	-- 1 = super admin mempublikasikan sendiri tanpa admin kedua.
	solo INTEGER NOT NULL DEFAULT 0 CHECK (solo IN (0, 1))
) WITHOUT ROWID;

-- Persetujuan hanya bisa diberikan setelah pemungutan suara ditutup, supaya tidak ada yang
-- "menyetujui duluan" sehingga hasil langsung tampil saat ditutup.
CREATE TRIGGER results_approvals_require_closed
BEFORE INSERT ON results_approvals
BEGIN
	SELECT RAISE(ABORT, 'voting_not_closed')
	WHERE NOT EXISTS (
		SELECT 1 FROM election_config
		WHERE closes_at IS NOT NULL AND unixepoch() >= closes_at
	);
END;

-- Persetujuan ganda dari admin yang sama ditolak, juga lewat `INSERT OR REPLACE` (yang di SQLite
-- menghapus baris lama tanpa menjalankan trigger DELETE).
CREATE TRIGGER results_approvals_no_replace
BEFORE INSERT ON results_approvals
WHEN EXISTS (SELECT 1 FROM results_approvals WHERE admin_email = NEW.admin_email)
BEGIN
	SELECT RAISE(ABORT, 'results_approvals_immutable');
END;

CREATE TRIGGER results_approvals_no_update
BEFORE UPDATE ON results_approvals
BEGIN
	SELECT RAISE(ABORT, 'results_approvals_immutable');
END;

CREATE TRIGGER results_approvals_no_delete
BEFORE DELETE ON results_approvals
BEGIN
	SELECT RAISE(ABORT, 'results_approvals_immutable');
END;
