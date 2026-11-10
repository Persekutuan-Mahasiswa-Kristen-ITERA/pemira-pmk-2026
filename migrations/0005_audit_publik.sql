-- Audit suara publik dibuka oleh admin, bukan otomatis.
--
-- Setelah pemungutan suara ditutup, halaman Hasil langsung menampilkan perolehan suara, tetapi
-- bagian audit (pencarian kode tanda terima dan unduhan CSV semua surat suara + SHA-256) baru
-- tampil setelah admin mengaktifkannya, misalnya saat masa sanggah atau ada sengketa. Kolom ini
-- tidak termasuk kolom yang dikunci trigger `election_config_lock_schedule`, jadi boleh diubah
-- kapan saja dan setiap perubahan dicatat aplikasi di audit log.
ALTER TABLE election_config
	ADD COLUMN audit_public INTEGER NOT NULL DEFAULT 0 CHECK (audit_public IN (0, 1));

-- Trigger lama menolak SEMUA perubahan `election_config` setelah pemilihan ditutup, karena
-- syarat `NEW.closes_at < unixepoch()` juga berlaku saat closes_at tidak diubah. Sekarang syarat
-- itu hanya dicek bila closes_at memang berubah. Aturannya tetap: setelah dibuka, judul dan waktu
-- buka tidak bisa diubah, waktu tutup hanya bisa dimajukan (tutup darurat) dan tidak ke masa lalu,
-- sehingga pemilihan yang sudah ditutup tidak bisa dibuka kembali.
DROP TRIGGER election_config_lock_schedule;

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
