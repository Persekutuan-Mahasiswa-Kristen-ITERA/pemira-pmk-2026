-- Data contoh untuk pengembangan LOKAL saja (nama dan NIM fiktif).
-- Jalankan: pnpm db:reset:local && pnpm db:seed:local
-- Membuka jendela pemilihan selama 7 hari mulai sekarang.

INSERT INTO candidates (id, number, name, vision, mission) VALUES
	(1, 1, 'Calon Contoh Satu', 'Visi contoh calon satu.', 'Misi contoh calon satu.'),
	(2, 2, 'Calon Contoh Dua', 'Visi contoh calon dua.', 'Misi contoh calon dua.');

-- Login lokal dengan email berpola nama.000000001@student.itera.ac.id tidak mungkin (akun
-- fiktif); untuk mencoba alur memilih, tambahkan NIM akun ITERA-mu sendiri di sini secara lokal.
INSERT INTO voters (nim, name) VALUES
	('000000001', 'Pemilih Satu'),
	('000000002', 'Pemilih Dua'),
	('000000003', 'Pemilih Tiga');

UPDATE election_config
SET opens_at = unixepoch() - 60, closes_at = unixepoch() + 7 * 24 * 3600
WHERE id = 1;
