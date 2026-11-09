-- Data contoh untuk pengembangan LOKAL saja (nama dan email fiktif).
-- Jalankan: pnpm db:reset:local && pnpm db:seed:local
-- Membuka jendela pemilihan selama 7 hari mulai sekarang.

INSERT INTO candidates (id, number, name, vision, mission) VALUES
	(1, 1, 'Calon Contoh Satu', 'Visi contoh calon satu.', 'Misi contoh calon satu.'),
	(2, 2, 'Calon Contoh Dua', 'Visi contoh calon dua.', 'Misi contoh calon dua.');

INSERT INTO voters (email, name) VALUES
	('pemilih.satu.000000001@student.itera.ac.id', 'Pemilih Satu'),
	('pemilih.dua.000000002@student.itera.ac.id', 'Pemilih Dua'),
	('pemilih.tiga.000000003@student.itera.ac.id', 'Pemilih Tiga');

UPDATE election_config
SET opens_at = unixepoch() - 60, closes_at = unixepoch() + 7 * 24 * 3600
WHERE id = 1;
