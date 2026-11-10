-- Data DUMMY untuk demo/presentasi di komputer LOKAL saja (semua nama, NIM, dan email fiktif).
-- Dipakai oleh `pnpm dev` → "Dummy local" (scripts/dev.mjs), yang mengosongkan database lokal,
-- menjalankan migrasi, lalu menjalankan berkas ini. Login demo memakai impersonate, bukan Google.
--
-- Pengguna:
--   ketua.panitia@example.com            super admin (hanya di mode demo, lihat src/lib/server/demo.ts)
--   admin.satu@example.com, admin.dua@…  admin (untuk mencoba kode pengecualian dua admin)
--   petugas.satu/dua/tiga@example.com    Petugas TPS
--   namadepan.nim@student.itera.ac.id    40 pemilih di DPT; 18 sudah memilih
--   tamu.129999999@student.itera.ac.id   mahasiswa yang tidak ada di DPT
--
-- Urutan penting: DPT, calon, dan jadwal terkunci begitu jendela pemilihan dibuka, jadi semuanya
-- diisi dulu; suara contoh dimasukkan setelah jendela dibuka (lewat izin memilih, seperti aslinya).

UPDATE election_config SET title = 'Pemilihan Ketua PMK ITERA 2027 (DEMO)' WHERE id = 1;

INSERT INTO candidates (id, number, name, vision, mission) VALUES
	(1, 1, 'Calon Satu',
		'PMK ITERA yang bertumbuh dalam firman dan hadir bagi kampus.',
		'Memperkuat kelompok kecil; membuka ibadah bagi mahasiswa baru; pelayanan sosial tiap semester.'),
	(2, 2, 'Calon Dua',
		'Persekutuan yang hangat, terbuka, dan saling menopang.',
		'Pendampingan akademik antarangkatan; doa bersama mingguan; kolaborasi dengan persekutuan kampus lain.'),
	(3, 3, 'Calon Tiga',
		'Mahasiswa Kristen yang melayani lewat keahliannya.',
		'Pelatihan kepemimpinan; pelayanan berbasis program studi; administrasi organisasi yang transparan.');

INSERT INTO voters (nim, name) VALUES
	('121140001', 'Abigail Siregar'),
	('122147002', 'Andreas Nainggolan'),
	('123154003', 'Agnes Purba'),
	('124161004', 'Benny Sihombing'),
	('121168005', 'Christina Lumbantobing'),
	('122175006', 'Daniel Pardede'),
	('123182007', 'Debora Sinaga'),
	('124189008', 'Elisabeth Hutagalung'),
	('121196009', 'Febrian Situmorang'),
	('122143010', 'Gabriel Manalu'),
	('123150011', 'Gracia Panjaitan'),
	('124157012', 'Hana Simatupang'),
	('121164013', 'Imanuel Silalahi'),
	('122171014', 'Jessica Tambunan'),
	('123178015', 'Jonathan Sitorus'),
	('124185016', 'Kezia Marpaung'),
	('121192017', 'Lidya Damanik'),
	('122199018', 'Markus Saragih'),
	('123146019', 'Natalia Ginting'),
	('124153020', 'Obaja Sembiring'),
	('121160021', 'Priskila Tarigan'),
	('122167022', 'Ruben Sitepu'),
	('123174023', 'Samuel Hasibuan'),
	('124181024', 'Sarah Napitupulu'),
	('121188025', 'Timotius Simbolon'),
	('122195026', 'Ursula Manurung'),
	('123142027', 'Vincent Lubis'),
	('124149028', 'Wilona Pasaribu'),
	('121156029', 'Yakobus Rumahorbo'),
	('122163030', 'Yohana Sianturi'),
	('123170031', 'Zefanya Butarbutar'),
	('124177032', 'Bernadus Gultom'),
	('121184033', 'Clara Harahap'),
	('122191034', 'Dewi Simorangkir'),
	('123198035', 'Elia Batubara'),
	('124145036', 'Fransiska Togatorop'),
	('121152037', 'Gideon Aritonang'),
	('122159038', 'Helena Siahaan'),
	('123166039', 'Ishak Pakpahan'),
	('124173040', 'Juliana Hutapea');

INSERT INTO admins (email, invited_by) VALUES
	('admin.satu@example.com', 'ketua.panitia@example.com'),
	('admin.dua@example.com', 'ketua.panitia@example.com');

INSERT INTO officers (email, invited_by) VALUES
	('petugas.satu@example.com', 'ketua.panitia@example.com'),
	('petugas.dua@example.com', 'ketua.panitia@example.com'),
	('petugas.tiga@example.com', 'ketua.panitia@example.com');

INSERT INTO audit_log (actor_email, action, detail) VALUES
	('ketua.panitia@example.com', 'admin.invite', '{"email":"admin.satu@example.com"}'),
	('ketua.panitia@example.com', 'admin.invite', '{"email":"admin.dua@example.com"}'),
	('ketua.panitia@example.com', 'officer.invite', '{"email":"petugas.satu@example.com"}'),
	('ketua.panitia@example.com', 'officer.invite', '{"email":"petugas.dua@example.com"}'),
	('ketua.panitia@example.com', 'officer.invite', '{"email":"petugas.tiga@example.com"}'),
	('admin.satu@example.com', 'dpt.replace', '{"count":40,"source":"seed-demo.sql"}'),
	('admin.satu@example.com', 'candidate.create', '{"number":1}'),
	('admin.satu@example.com', 'candidate.create', '{"number":2}'),
	('admin.satu@example.com', 'candidate.create', '{"number":3}'),
	('admin.satu@example.com', 'schedule.set', '{"note":"buka 1 jam lalu, tutup 12 jam lagi"}');

-- Jendela pemilihan: dibuka 1 jam lalu, ditutup 12 jam lagi (pakai "Tutup darurat" di admin
-- untuk memperlihatkan halaman Hasil).
UPDATE election_config
SET opens_at = unixepoch() - 3600, closes_at = unixepoch() + 12 * 3600
WHERE id = 1;

-- Kode TPS yang sudah dibuat petugas: 17 dipakai, 3 kedaluwarsa (rekonsiliasi di Admin → Ringkasan).
INSERT INTO booth_codes (code_hash, created_by, created_at, expires_at, used_at) VALUES
	('0bd8bd37ba2c783289b856ff56e53404f88ae554a95a62dc7656fb0d9008d82c', 'petugas.satu@example.com', unixepoch() - 3000, unixepoch() - 2880, unixepoch() - 3000),
	('d9ad3c607535626f90c5181854c08e9c19dcacac5e6aec9f56596eaf43ea6e61', 'petugas.dua@example.com', unixepoch() - 2880, unixepoch() - 2760, unixepoch() - 2880),
	('c72f42362408a53421f20130e323088fb1d84dde12e78cbad1904db7c8af0f01', 'petugas.tiga@example.com', unixepoch() - 2760, unixepoch() - 2640, unixepoch() - 2760),
	('f73e46c8ff95d97dd8ad881c3dff921f7b4004820d3326178ebc74979e10a74a', 'petugas.satu@example.com', unixepoch() - 2640, unixepoch() - 2520, unixepoch() - 2640),
	('ac9d8ecdc39a3cddd8669457ec91b631001d3417f82c3041176c3fec9b04e446', 'petugas.dua@example.com', unixepoch() - 2520, unixepoch() - 2400, unixepoch() - 2520),
	('f674a868b13f660375a456baa25c601f589dac7cbff41658ac6fb71c277311c4', 'petugas.tiga@example.com', unixepoch() - 2400, unixepoch() - 2280, unixepoch() - 2400),
	('5b82a79a9cbbc059ae2114f991f26ec8565799b48504aa6b37ad1aedb547bbb1', 'petugas.satu@example.com', unixepoch() - 2280, unixepoch() - 2160, unixepoch() - 2280),
	('c22a45c5860685348602889d8e261698a3304070999dd3135ca0e034f5e80457', 'petugas.dua@example.com', unixepoch() - 2160, unixepoch() - 2040, unixepoch() - 2160),
	('da43de94cb8993f40bca3252dc12d5b55d021d3214afbef46521c6bc9762b2e6', 'petugas.tiga@example.com', unixepoch() - 2040, unixepoch() - 1920, unixepoch() - 2040),
	('dae52353bfabc36e70565b86eebb35038597dd7cc2aa1d86d3839c48bcc005c9', 'petugas.satu@example.com', unixepoch() - 1920, unixepoch() - 1800, unixepoch() - 1920),
	('f02a1d43f22fb1804f8982a74279ab491589b843728711adf07585c8c2716d33', 'petugas.dua@example.com', unixepoch() - 1800, unixepoch() - 1680, unixepoch() - 1800),
	('4111f5dd45e87730e874fc033f21e5e8a87ebd2e7fa38491dfcff89170223411', 'petugas.tiga@example.com', unixepoch() - 1680, unixepoch() - 1560, unixepoch() - 1680),
	('f893e167600ca2db3387b9bb64f90fb88529c4ec7d558ce7b26b71d2f7d80049', 'petugas.satu@example.com', unixepoch() - 1560, unixepoch() - 1440, unixepoch() - 1560),
	('01c4d006471ce60a9623ff6f8f314ebc22ed971889e3ce0243fcea67bd769b9f', 'petugas.dua@example.com', unixepoch() - 1440, unixepoch() - 1320, unixepoch() - 1440),
	('1226dd2c8f856e23aaa588b2d9d72bdeee5dfe0fe29351a8ecaebd2542460cf7', 'petugas.tiga@example.com', unixepoch() - 1320, unixepoch() - 1200, unixepoch() - 1320),
	('bb326ea53d2a69d21218cc756ab6d58be1c226ab7e9bc761e1c659eb218de2ec', 'petugas.satu@example.com', unixepoch() - 1200, unixepoch() - 1080, unixepoch() - 1200),
	('f3f57fb3cd13571b840f0b164809773584510777628a06909eacbb249340b5ba', 'petugas.dua@example.com', unixepoch() - 1080, unixepoch() - 960, unixepoch() - 1080),
	('e0555ad8b17301645c5745cfb86afa3cc9c92324824ba4d5af25bf0765f513c4', 'petugas.tiga@example.com', unixepoch() - 960, unixepoch() - 840, NULL),
	('940d7e4e5f6e4e7d7673f33d4ba9a3397489f753c0a51fbd16035b94dc96cef1', 'petugas.satu@example.com', unixepoch() - 840, unixepoch() - 720, NULL),
	('ff32952c702a9b445d7f25456790ac358bbda5cc7a7a3b50ddfc91f5ef569525', 'petugas.dua@example.com', unixepoch() - 720, unixepoch() - 600, NULL);

-- Satu pemilih lewat jalur pengecualian (dua admin berbeda); NIM-nya muncul di /hasil setelah ditutup.
INSERT INTO exception_codes
	(id, nim, reason, requested_by, requested_at, approved_by, approved_at, code_hash, expires_at, used_at)
VALUES ('demo-pengecualian-1', '122199018', 'Akun Google dikunci, reset UPA TIK belum selesai',
	'admin.satu@example.com', unixepoch() - 1500, 'admin.dua@example.com', unixepoch() - 1450,
	'9d8724bf41734f6d6a1c0dda5e93490f177ecf742af6c153eea7b4885b94fe54', unixepoch() - 1150, unixepoch() - 1400);
INSERT INTO audit_log (actor_email, action, detail) VALUES
	('admin.satu@example.com', 'exception.request', '{"nim":"122199018"}'),
	('admin.dua@example.com', 'exception.approve', '{"nim":"122199018"}');

-- 18 suara contoh. Setiap suara butuh izin memilih yang masih berlaku (trigger), dan izin itu
-- dihapus otomatis saat suara masuk, persis seperti alur aslinya.
INSERT INTO vote_passes (nim, session_hash, via, expires_at) VALUES
	('121140001', '03c6e2712bfb7f53acc4f7bdabe37995e02d08f605c5a6e9d2389448c16effec', 'tps', unixepoch() + 300),
	('122147002', '89fe410c581e0e309e8852e267653da9151989600138c7901b635db0e4bd46c3', 'tps', unixepoch() + 300),
	('123154003', '2d83010a99ac6e7ee3a103de4e7b67ac4993fe6e90fa1c81f301a5df34e2179e', 'tps', unixepoch() + 300),
	('124161004', '339a1c654ab626327d1363635840b9358d49a6ea34e289a1d703d9d60fa6b908', 'tps', unixepoch() + 300),
	('121168005', '4e5131a0fdac163524860e56f4e7d0963280f8643ec34c597c3fedf8cefe45f0', 'tps', unixepoch() + 300),
	('122175006', 'dfbc676ebe0fabcace34bd9b4b02f07c4808ac909386d1f61ef54ed8605ac006', 'tps', unixepoch() + 300),
	('123182007', 'f7d3551a9b17c3fa5c60890644df0ccd37838248e847eeecdd3cb3a8a01762e0', 'tps', unixepoch() + 300),
	('124189008', 'fee6058d6d97d715aec55c6744231730ec3cdb0d33527f464fe63b6d541f3279', 'tps', unixepoch() + 300),
	('121196009', 'b42852f192c0b9a79491f880ffb2a64acb7344904f5ba87e583d3329a6cf1d79', 'tps', unixepoch() + 300),
	('122143010', '53cfbb726d725b7194121ae06acf8fda3a78aa91492cfbac5beceda9dd84bbe3', 'tps', unixepoch() + 300),
	('123150011', '0eb097fe06fd404a9b87dfb5d73dd64e0993212e416bd5819641874045d28af5', 'tps', unixepoch() + 300),
	('124157012', 'ae3cf653393e5eb599080b672ea9aba0c7a2b2ce702b892d1a0eb8fa985594fb', 'tps', unixepoch() + 300),
	('121164013', '54004c58953c5315dd2d4cc9fa1995cb0f26104cd493d9a7db553b8b3eea4b5a', 'tps', unixepoch() + 300),
	('122171014', 'b8c9258a84dfc3d6dba8831b01c6fa5ebb74aea53d8347c52ed4c5be10938521', 'tps', unixepoch() + 300),
	('123178015', '217b3d0f1902e6d16de19a9edda31b3be17894572d6a61d5f197698c40692d3d', 'tps', unixepoch() + 300),
	('124185016', 'd8ab9cd8bdf83b022588780101fe79b351eec2ad7381ee3da78682f4f2211e0e', 'tps', unixepoch() + 300),
	('121192017', '227706c93ed42fafa0413e8f0ec4357fc9d7a0d699d92991d825c7bcd5fde854', 'tps', unixepoch() + 300),
	('122199018', '6125dae5320e6a05b4d651ad370dedbb7d5c7842fb3a0774f7f04c7c11a18683', 'exception', unixepoch() + 300);

INSERT INTO voted (nim) VALUES
	('121140001'),
	('122147002'),
	('123154003'),
	('124161004'),
	('121168005'),
	('122175006'),
	('123182007'),
	('124189008'),
	('121196009'),
	('122143010'),
	('123150011'),
	('124157012'),
	('121164013'),
	('122171014'),
	('123178015'),
	('124185016'),
	('121192017'),
	('122199018');

INSERT INTO ballots (code, candidate_id) VALUES
	('0NQJR-YXDRX', 1),
	('0X280-SDKHS', 1),
	('3MYG6-HTR5B', 2),
	('5ANTR-83B0W', 2),
	('75TG4-CRMC9', 1),
	('BYHF1-YG9DQ', 1),
	('E65KZ-V8GW8', 2),
	('ESXRA-XQM7C', 3),
	('F3X9A-XYC5D', 3),
	('GJHC6-6EGT5', 2),
	('GVHPF-T1CX8', 2),
	('H45T4-ZED27', 2),
	('J4EDX-1ARJW', 1),
	('JA9SK-DGPCR', 3),
	('K5178-NW081', 1),
	('NC6BY-98Z4R', 1),
	('NCBJ6-DXCF4', 1),
	('NK4GG-VEANP', 3);
