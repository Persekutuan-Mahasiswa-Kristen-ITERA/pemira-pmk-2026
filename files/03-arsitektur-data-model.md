# 03. Arsitektur dan Data Model

## 1. Komponen

```
Device kiosk (browser, profil khusus)         Laptop admin IT
        |                                            |
        +----------------- HTTPS --------------------+
                            |
                 Cloudflare Workers (Astro SSR)
                  |      |       |        |
                 D1      R2      KV    Turnstile
              (Drizzle) (foto) (rate)        \
                                         Google OAuth (Arctic)
```

- **Workers (Astro SSR)**: halaman kiosk, halaman admin, endpoint API. Satu Worker.
- **D1**: satu database per environment. **R2**: foto kandidat. **KV**: rate limiting (best-effort, bukan satu-satunya kontrol). **Turnstile**: pada aktivasi device dan login admin.
- **Environment**: `staging` (D1, R2, KV terpisah, untuk dry-run) dan `production` (dibuat bersih dan baru diisi DPT final pada H-1). Dry-run TIDAK dilakukan di database produksi.
- Redirect URI Google OAuth didaftarkan untuk kedua environment.

## 2. Alur utama

### 2.1 Registrasi device

1. Admin membuat device (nama) → sistem membuat kode aktivasi acak (≥ 10 karakter, entropi tinggi), menyimpan **hash** dan masa berlaku (15 menit), status `pending`. Kode asli ditampilkan sekali.
2. Di device, buka halaman aktivasi, isi kode (Turnstile + rate limit). Jika cocok dan belum kedaluwarsa: status `active`, server membuat token device acak 256-bit, menyimpan **hash**, mengirim cookie `__Host-device` (HttpOnly, Secure, SameSite=Lax, masa berlaku panjang). Kode aktivasi hangus.
3. Setiap request voter memeriksa token device → hash → `devices.status='active'`. Admin dapat mencabut (`revoked`) dan efeknya langsung.

Catatan: cookie device harus bertahan antar pemilih, sehingga browser kiosk memakai **profil khusus yang persisten**, bukan incognito. Kebersihan sesi Google ditangani lewat langkah logout (2.2 langkah 7) dan harus diverifikasi saat dry-run.

### 2.2 Login dan voting

1. Pemilih menekan "Mulai" → `/auth/google/start` (device harus valid). Server membuat `state` + PKCE, disimpan di cookie pendek, redirect ke Google dengan `prompt=select_account` (agent memeriksa dokumentasi Google untuk parameter yang valid).
2. Callback: verifikasi `state`, tukar kode, validasi ID token: `email_verified=true`, domain `student.itera.ac.id` (dan klaim `hd` bila ada), email dinormalisasi lowercase.
3. Cari email di `voters` (election aktif). Tidak ada → tolak. `has_voted=1` → tolak. Respons tolak bersifat generik dan tidak membocorkan data lain.
4. Buat sesi voter (token acak, hash disimpan di `voter_sessions`, terikat ke voter dan device, kedaluwarsa pendek, idle timeout).
5. Tampilkan kandidat → pilih → layar konfirmasi → `POST /api/vote` (token CSRF + cek Origin).
6. Server menjalankan algoritma vote atomik (bagian 5), menghapus sesi, merespons "tercatat" tanpa menyebut pilihan.
7. Layar selesai: hapus cookie sesi, arahkan ke logout Google, kembali ke layar awal otomatis beberapa detik kemudian.

### 2.3 Admin

Login Google yang sama, tetapi email harus ada di `admins` dengan `active=1`. Sesi admin terpisah (`admin_sessions`), tidak bisa dipakai untuk voting, dan tidak memerlukan device terdaftar. Admin pertama dimasukkan lewat perintah `wrangler d1 execute` yang didokumentasikan (bukan endpoint publik).

## 3. State machine pemilu

| Dari        | Ke                  | Syarat                                                                                        | Dicatat audit |
| ----------- | ------------------- | --------------------------------------------------------------------------------------------- | ------------- |
| `draft`     | `published`         | ≥ 1 kandidat, DPT terisi, `opens_at < closes_at`, kandidat tunggal ⇒ `blank_option_enabled=1` | ya            |
| `published` | `draft`             | belum pernah `open` dan `ballots` kosong                                                      | ya            |
| `published` | `open`              | aksi admin; suara tetap hanya sah dalam jendela waktu                                         | ya            |
| `open`      | `closed`            | aksi admin dengan konfirmasi                                                                  | ya            |
| `closed`    | `results_published` | rekonsiliasi cocok + 2 persetujuan admin berbeda                                              | ya            |

Transisi lain ditolak. Tidak ada `closed → open`. Edit kandidat/DPT hanya di `draft`. `closes_at` boleh dimajukan atau diperpanjang saat `open` (dicatat), tidak boleh melewati waktu yang sudah lewat.

## 4. Data model (D1/SQLite via Drizzle)

Aturan umum: PK bertipe TEXT (ID acak) kecuali `audit_log`; waktu = INTEGER epoch ms UTC; email lowercase; foreign key aktif; enum lewat CHECK. Migrasi dihasilkan drizzle-kit; bagian yang tidak didukung drizzle (WITHOUT ROWID, trigger) ditulis manual di file migrasi SQL dan didokumentasikan di `src/db/README.md` agar tidak tertimpa.

| Tabel                      | Kolom                                                                                                                                                                                         | Constraint penting                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elections`                | id, name, status, opens_at, closes_at, blank_option_enabled, results_unlocked_at (null), created_at                                                                                           | status CHECK (`draft`,`published`,`open`,`closed`,`results_published`)                                                                                          |
| `candidates`               | id, election_id, number, name, photo_key (null), vision, mission, program, created_at                                                                                                         | FK; UNIQUE(election_id, number)                                                                                                                                 |
| `voters` (DPT)             | id, election_id, nim, full_name, email, angkatan, prodi, has_voted (default 0), voted_at (null), created_at                                                                                   | UNIQUE(election_id, email), UNIQUE(election_id, nim); CHECK `(has_voted=0 AND voted_at IS NULL) OR (has_voted=1 AND voted_at IS NOT NULL)`. **Tanpa device_id** |
| `ballots`                  | id (hex 128-bit acak), election_id, candidate_id (null), is_blank                                                                                                                             | **WITHOUT ROWID**; CHECK `(is_blank=1 AND candidate_id IS NULL) OR (is_blank=0 AND candidate_id IS NOT NULL)`. **Tanpa voter_id, device_id, timestamp**         |
| `devices`                  | id, name, status (`pending`,`active`,`revoked`), activation_code_hash (null), activation_expires_at (null), token_hash (null), created_by, created_at, activated_at, last_seen_at, revoked_at | hanya hash disimpan                                                                                                                                             |
| `admins`                   | email (PK), role (`it_admin`), active, created_at                                                                                                                                             |                                                                                                                                                                 |
| `voter_sessions`           | token_hash (PK), voter_id, device_id, created_at, last_active_at, expires_at                                                                                                                  | dihapus saat vote sukses; baris kedaluwarsa dibersihkan                                                                                                         |
| `admin_sessions`           | token_hash (PK), admin_email, created_at, expires_at                                                                                                                                          |                                                                                                                                                                 |
| `results_unlock_approvals` | election_id, admin_email, approved_at                                                                                                                                                         | PK(election_id, admin_email)                                                                                                                                    |
| `audit_log`                | id (INTEGER autoincrement), at, actor_email, action, detail (JSON)                                                                                                                            | TRIGGER: UPDATE dan DELETE → `RAISE(ABORT)`                                                                                                                     |

Index: `voters(email)`, `ballots(election_id, candidate_id)`, `voter_sessions(expires_at)`.

`voted_at` diisi `floor(now/300000)*300000` (dibulatkan ke bawah per 5 menit). Digunakan untuk grafik turnout, bukan untuk korelasi suara.

Audit log mencatat: impor DPT (jumlah dan hash file), perubahan kandidat, perubahan status/jadwal, pembuatan/aktivasi/pencabutan device, persetujuan pembukaan hasil, penolakan login (alasan, bukan pilihan). Tidak pernah mencatat pilihan kandidat.

## 5. Algoritma vote atomik

```
Validasi di aplikasi (semua harus lolos, kalau tidak 4xx):
  device aktif; sesi voter valid, belum kedaluwarsa, milik device ini;
  election.status='open' dan opens_at <= now < closes_at;
  payload tepat salah satu: candidate_id milik election ini ATAU blank=true (jika diizinkan)

db.batch([
  INSERT INTO ballots (id, election_id, candidate_id, is_blank)
    SELECT :ballotId, :eid, :cid, :isBlank
    WHERE EXISTS (SELECT 1 FROM voters WHERE id=:vid AND has_voted=0)
      AND EXISTS (SELECT 1 FROM elections WHERE id=:eid AND status='open'
                  AND :now >= opens_at AND :now < closes_at),
  UPDATE voters SET has_voted=1, voted_at=:bucket
    WHERE id=:vid AND has_voted=0
      AND EXISTS (SELECT 1 FROM elections WHERE id=:eid AND status='open'
                  AND :now >= opens_at AND :now < closes_at),
  DELETE FROM voter_sessions WHERE token_hash=:th
])

Sukses hanya jika changes kedua statement pertama = 1.
Selain itu: tolak, jangan retry otomatis, catat kejadian keamanan (tanpa pilihan).
```

Agent wajib memverifikasi dari dokumentasi D1 bahwa `db.batch()` berjalan sebagai satu transaksi dan membuktikannya dengan tes request paralel (T-V3, T-V7). Jika perilaku batch berbeda dari asumsi di sini, berhenti dan usulkan alternatif untuk persetujuan.

Penghitungan hasil: `SELECT candidate_id, is_blank, COUNT(*) FROM ballots WHERE election_id=? GROUP BY candidate_id, is_blank`, hanya dari kode yang dilindungi status dan persetujuan.

## 6. Matriks otorisasi endpoint

| Kelompok        | Endpoint (nama final boleh disesuaikan agent)                                   | Syarat                                                    |
| --------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Publik          | `GET /`, `GET /api/health`                                                      | tidak ada; tidak membocorkan info                         |
| Aktivasi device | `GET/POST /device/activate`                                                     | kode aktivasi valid + Turnstile + rate limit              |
| Voter           | `GET /vote`, `GET /auth/google/start`, `GET /auth/google/callback`              | token device aktif                                        |
| Voter           | `GET /vote/ballot`, `POST /api/vote`, `POST /api/vote/logout`, `GET /vote/done` | token device aktif + sesi voter valid                     |
| Admin           | `/admin/login`, `/admin/auth/google/callback`                                   | Turnstile (login)                                         |
| Admin           | `/admin/**` (election, kandidat, DPT, device, turnout, transisi, audit)         | sesi admin valid + admin aktif + CSRF untuk POST          |
| Admin           | endpoint hasil/ekspor                                                           | di atas + status `results_published`                      |
| Admin           | persetujuan pembukaan hasil                                                     | di atas + status `closed` + admin berbeda per persetujuan |

Default semua endpoint: **tolak**. Setiap endpoint punya tes akses tanpa login dan dengan peran salah.

## 7. Header dan sesi

- Semua respons: `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, plus CSP ketat (Fase 8).
- Halaman voter dan admin: `Cache-Control: no-store`.
- Cookie: prefix `__Host-`, HttpOnly, Secure, SameSite=Lax (callback OAuth adalah navigasi top-level, jadi Strict akan merusak alur).

## 8. Struktur folder yang disarankan

```
src/pages/ (kiosk, admin, api)   src/lib/ (auth, session, device, vote, election, audit)
src/db/ (schema.ts, README.md)   migrations/   scripts/ (seed-dev, import-dpt-sample)
tests/ (unit, integration)       docs/   data/ (gitignored)
```
