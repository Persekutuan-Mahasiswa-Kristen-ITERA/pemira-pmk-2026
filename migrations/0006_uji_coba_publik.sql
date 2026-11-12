-- Mode uji coba publik di database production.
--
-- Sebelum hari-H, situs resmi boleh dipakai publik untuk uji coba. Selama `public_test = 1`, setiap
-- halaman menampilkan pita "Uji coba publik". Flag ini disimpan di database (bukan variabel deploy)
-- supaya pita dan data uji selalu sejalan: skrip `scripts/reset-uji-coba.sql` menghapus data uji
-- DAN mematikan flag dalam satu langkah, tanpa deploy ulang. Skrip reset juga menolak berjalan bila
-- flag sudah 0, sehingga tidak mungkin terjalankan saat pemilihan resmi.
--
-- Default 0: database baru tidak pernah otomatis dalam mode uji. Menyalakan:
-- `scripts/uji-coba-publik-on.sql`. Kolom ini tidak dikunci trigger `election_config_lock_schedule`.
ALTER TABLE election_config
	ADD COLUMN public_test INTEGER NOT NULL DEFAULT 0 CHECK (public_test IN (0, 1));
