-- SIMULASI PEMILIHAN LENGKAP untuk pengembangan LOKAL saja. Semua data fiktif.
-- Jalankan dengan database kosong:  pnpm db:demo:local
--   (= reset + migrasi + seed-dev-panitia.sql + berkas ini)
--
-- Hasil akhir: pemilihan sudah DITUTUP, sehingga /hasil menampilkan perolehan suara,
-- daftar kode tanda terima (CSV + SHA-256), dan NIM jalur pengecualian.
--
-- Semua baris dimasukkan lewat aturan database yang sama dengan aplikasi (trigger di
-- migrations/): jendela pemilihan harus terbuka, setiap NIM harus punya izin memilih,
-- lalu pemilihan ditutup dengan "tutup darurat" (closes_at dimajukan ke sekarang).
-- Surat suara tetap anonim: tidak ada kolom yang menghubungkannya ke NIM.

-- ---------------------------------------------------------------------------
-- 1. Sebelum pemilihan dibuka: calon dan DPT (masih bisa diubah)
-- ---------------------------------------------------------------------------
INSERT INTO candidates (id, number, name, vision, mission) VALUES
	(1, 1, 'Yohanes Pratama Sitorus',
		'PMK ITERA yang bertumbuh dalam iman dan menjadi berkat bagi kampus.',
		'1. Persekutuan rutin yang hangat dan inklusif. 2. Kelompok kecil di setiap angkatan. 3. Pelayanan sosial ke sekitar kampus.'),
	(2, 2, 'Grace Natalia Simanjuntak',
		'Persekutuan yang solid, kreatif, dan relevan bagi mahasiswa.',
		'1. Kaderisasi pengurus yang terencana. 2. Media PMK yang aktif dan informatif. 3. Kolaborasi dengan UKM dan PMK kampus lain.'),
	(3, 3, 'Daniel Kristian Hutabarat',
		'Satu keluarga dalam Kristus, melayani dengan sukacita.',
		'1. Pembinaan rohani berjenjang. 2. Transparansi keuangan dan program. 3. Retret dan camp tahunan yang terjangkau.');

-- DPT: 120 pemilih fiktif, NIM 9 digit berpola 12xxxx001..120 (tidak ada di kampus).
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 120)
INSERT INTO voters (nim, name)
SELECT printf('%03d%03d%03d', 120 + ((i - 1) % 5), 100 + ((i - 1) / 5), i),
       'Pemilih Simulasi ' || printf('%03d', i)
FROM n;

INSERT INTO audit_log (at, actor_email, action, detail) VALUES
	(unixepoch() - 6 * 24 * 3600, 'kepala.panitia@example.com', 'candidate.create', '{"number":1,"name":"Yohanes Pratama Sitorus"}'),
	(unixepoch() - 6 * 24 * 3600, 'kepala.panitia@example.com', 'candidate.create', '{"number":2,"name":"Grace Natalia Simanjuntak"}'),
	(unixepoch() - 6 * 24 * 3600, 'kepala.panitia@example.com', 'candidate.create', '{"number":3,"name":"Daniel Kristian Hutabarat"}'),
	(unixepoch() - 5 * 24 * 3600, 'admin.satu@example.com',     'dpt.replace',      '{"count":120,"sha256":"(simulasi)"}');

-- ---------------------------------------------------------------------------
-- 2. Buka pemilihan (dibuka 8 jam lalu; sementara ditutup 1 jam ke depan)
-- ---------------------------------------------------------------------------
UPDATE election_config
SET title = 'Pemilihan Ketua PMK ITERA 2027 (SIMULASI)',
    opens_at = unixepoch() - 8 * 3600,
    closes_at = unixepoch() + 3600
WHERE id = 1;

INSERT INTO audit_log (at, actor_email, action, detail)
SELECT unixepoch() - 4 * 24 * 3600, 'kepala.panitia@example.com', 'schedule.set',
       json_object('title', title, 'opens_at', opens_at, 'closes_at', closes_at)
FROM election_config WHERE id = 1;

-- ---------------------------------------------------------------------------
-- 3. Kode TPS yang sudah terpakai (hanya hash acak yang disimpan), dibuat 4 petugas
-- ---------------------------------------------------------------------------
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 86)
INSERT INTO booth_codes (code_hash, created_by, created_at, expires_at, used_at)
SELECT lower(hex(randomblob(32))),
       'petugas.tps' || (1 + (i % 4)) || '@example.com',
       unixepoch() - 7 * 3600 + i * 240,
       unixepoch() - 7 * 3600 + i * 240 + 120,
       unixepoch() - 7 * 3600 + i * 240 + 45
FROM n;

-- ---------------------------------------------------------------------------
-- 4. Satu pemilih lewat jalur pengecualian (tanpa login Google), 2 admin berbeda
-- ---------------------------------------------------------------------------
INSERT INTO exception_codes (id, nim, reason, requested_by, requested_at, approved_by, approved_at, code_hash, expires_at, used_at)
SELECT lower(hex(randomblob(16))), nim, 'Akun Google kampus terkunci, KTM sudah diperiksa di TPS.',
       'admin.satu@example.com', unixepoch() - 5 * 3600,
       'admin.dua@example.com',  unixepoch() - 5 * 3600 + 90,
       lower(hex(randomblob(32))), unixepoch() - 5 * 3600 + 90 + 600,
       unixepoch() - 5 * 3600 + 200
FROM voters WHERE name = 'Pemilih Simulasi 087';

INSERT INTO audit_log (at, actor_email, action, detail)
SELECT unixepoch() - 5 * 3600, 'admin.satu@example.com', 'exception.request', json_object('id', id, 'nim', nim, 'reason', reason)
FROM exception_codes;
INSERT INTO audit_log (at, actor_email, action, detail)
SELECT unixepoch() - 5 * 3600 + 90, 'admin.dua@example.com', 'exception.approve', json_object('id', id, 'nim', nim)
FROM exception_codes;

-- ---------------------------------------------------------------------------
-- 5. Pemungutan suara: 87 dari 120 pemilih memilih.
--    Izin memilih dibuat untuk setiap NIM (dihapus otomatis oleh trigger begitu suara masuk),
--    lalu penanda "sudah memilih" dan surat suara anonim dimasukkan terpisah.
-- ---------------------------------------------------------------------------
INSERT INTO vote_passes (nim, session_hash, via, expires_at)
SELECT nim, lower(hex(randomblob(32))),
       CASE WHEN name = 'Pemilih Simulasi 087' THEN 'exception' ELSE 'tps' END,
       unixepoch() + 300
FROM voters
WHERE CAST(substr(name, -3) AS INTEGER) <= 87;

INSERT INTO voted (nim)
SELECT nim FROM voters WHERE CAST(substr(name, -3) AS INTEGER) <= 87;

-- Surat suara: 87 kode tanda terima acak (Crockford Base32, XXXXX-XXXXX) dengan sebaran
-- 1: 38 suara, 2: 31 suara, 3: 18 suara. Urutan baris tidak bermakna (WITHOUT ROWID).
WITH RECURSIVE
	n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 87),
	alpha(a) AS (SELECT '0123456789ABCDEFGHJKMNPQRSTVWXYZ'),
	code(i, c) AS (
		SELECT i,
		       substr(a, 1 + abs(random()) % 32, 1) || substr(a, 1 + abs(random()) % 32, 1) ||
		       substr(a, 1 + abs(random()) % 32, 1) || substr(a, 1 + abs(random()) % 32, 1) ||
		       substr(a, 1 + abs(random()) % 32, 1) || '-' ||
		       substr(a, 1 + abs(random()) % 32, 1) || substr(a, 1 + abs(random()) % 32, 1) ||
		       substr(a, 1 + abs(random()) % 32, 1) || substr(a, 1 + abs(random()) % 32, 1) ||
		       substr(a, 1 + abs(random()) % 32, 1)
		FROM n, alpha
	)
INSERT INTO ballots (code, candidate_id)
SELECT c, CASE WHEN i <= 38 THEN 1 WHEN i <= 69 THEN 2 ELSE 3 END FROM code;

-- ---------------------------------------------------------------------------
-- 6. Tutup pemilihan sekarang (satu-satunya perubahan jadwal yang diizinkan setelah dibuka)
-- ---------------------------------------------------------------------------
UPDATE election_config SET closes_at = unixepoch() WHERE id = 1;

INSERT INTO audit_log (actor_email, action, detail) VALUES
	('kepala.panitia@example.com', 'election.close_early', '{"reason":"Simulasi: seluruh pemilih yang hadir sudah memilih."}');
