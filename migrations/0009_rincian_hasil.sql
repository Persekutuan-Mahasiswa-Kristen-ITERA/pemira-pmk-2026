-- Rincian hasil untuk publik: jumlah suara, atau persentase saja.
--
-- Atas permintaan pemilik proyek (13 November 2026):
--   - `results_detail = 'counts'` (bawaan, perilaku lama): publik melihat jumlah DPT, jumlah yang sudah
--     memilih, persentase partisipasi, dan jumlah serta persentase suara setiap calon.
--   - `results_detail = 'percent'`: publik hanya melihat persentase suara setiap calon. Semua angka yang
--     bisa dipakai menghitung jumlah suara ikut disembunyikan dari publik: jumlah DPT, jumlah yang sudah
--     memilih, persentase partisipasi (selama dan setelah pemungutan suara), dan CSV surat suara.
--     Pencarian kode tanda terima tetap tersedia (satu kode per pencarian). Admin tetap melihat angka
--     lengkap.
--   - Super admin boleh mengubahnya kapan saja (kolom ini tidak dikunci trigger
--     `election_config_lock_schedule`). Setiap perubahan dicatat aplikasi di audit log.
--
-- Pengaturan ini hanya soal tampilan; suara dan aturan pemilihan tidak berubah.

ALTER TABLE election_config
	ADD COLUMN results_detail TEXT NOT NULL DEFAULT 'counts'
	CHECK (results_detail IN ('counts', 'percent'));
