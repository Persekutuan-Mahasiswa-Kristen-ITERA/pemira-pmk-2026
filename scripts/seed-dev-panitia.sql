-- Data contoh panitia untuk pengembangan LOKAL saja (email fiktif, domain example.com).
-- Jalankan setelah seed-dev.sql:  pnpm db:seed:panitia:local
--
-- Kepala panitia = super admin, TIDAK disimpan di database melainkan di secret
-- SUPER_ADMIN_EMAILS (.dev.vars). Tambahkan di sana, misalnya:
--   SUPER_ADMIN_EMAILS=emailmu@gmail.com,kepala.panitia@example.com
--
-- Catatan: login tetap lewat Google asli, jadi email fiktif ini hanya tampil di
-- Admin -> Panitia. Untuk benar-benar masuk sebagai admin/petugas, undang akun Google
-- milikmu lewat halaman itu atau tambahkan emailnya di sini.

-- Admin (diundang kepala panitia)
INSERT INTO admins (email, invited_by, invited_at, last_login_at) VALUES
	('admin.satu@example.com', 'kepala.panitia@example.com', unixepoch() - 3 * 24 * 3600, unixepoch() - 2 * 3600),
	('admin.dua@example.com',  'kepala.panitia@example.com', unixepoch() - 3 * 24 * 3600, unixepoch() - 30 * 60),
	('admin.tiga@example.com', 'kepala.panitia@example.com', unixepoch() - 1 * 24 * 3600, NULL);

-- Petugas TPS (hanya bisa membuat kode TPS)
INSERT INTO officers (email, invited_by, invited_at, last_login_at) VALUES
	('petugas.tps1@example.com', 'kepala.panitia@example.com', unixepoch() - 2 * 24 * 3600, unixepoch() - 10 * 60),
	('petugas.tps2@example.com', 'kepala.panitia@example.com', unixepoch() - 2 * 24 * 3600, unixepoch() - 5 * 60),
	('petugas.tps3@example.com', 'kepala.panitia@example.com', unixepoch() - 2 * 24 * 3600, NULL),
	('petugas.tps4@example.com', 'admin.satu@example.com',     unixepoch() - 1 * 24 * 3600, NULL);

-- Jejak audit undangan, seperti yang ditulis aplikasi saat mengundang lewat /admin/panitia.
INSERT INTO audit_log (at, actor_email, action, detail) VALUES
	(unixepoch() - 3 * 24 * 3600, 'kepala.panitia@example.com', 'admin.invite',   '{"email":"admin.satu@example.com"}'),
	(unixepoch() - 3 * 24 * 3600, 'kepala.panitia@example.com', 'admin.invite',   '{"email":"admin.dua@example.com"}'),
	(unixepoch() - 1 * 24 * 3600, 'kepala.panitia@example.com', 'admin.invite',   '{"email":"admin.tiga@example.com"}'),
	(unixepoch() - 2 * 24 * 3600, 'kepala.panitia@example.com', 'officer.invite', '{"email":"petugas.tps1@example.com"}'),
	(unixepoch() - 2 * 24 * 3600, 'kepala.panitia@example.com', 'officer.invite', '{"email":"petugas.tps2@example.com"}'),
	(unixepoch() - 2 * 24 * 3600, 'kepala.panitia@example.com', 'officer.invite', '{"email":"petugas.tps3@example.com"}'),
	(unixepoch() - 1 * 24 * 3600, 'admin.satu@example.com',     'officer.invite', '{"email":"petugas.tps4@example.com"}');
