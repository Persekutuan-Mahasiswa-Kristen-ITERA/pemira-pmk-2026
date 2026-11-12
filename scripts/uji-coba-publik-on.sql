-- Menyalakan mode uji coba publik (pita "Uji coba publik" di semua halaman).
-- Dimatikan HANYA oleh `scripts/reset-uji-coba.sql`, yang sekaligus menghapus data uji.
UPDATE election_config SET public_test = 1 WHERE id = 1;
