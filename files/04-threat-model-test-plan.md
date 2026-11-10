# 04. Threat Model dan Test Plan

## 1. Aset dan aktor

**Aset**: kerahasiaan pilihan, integritas hitungan suara, keabsahan pemilih (satu orang satu suara), ketersediaan sistem 07.00-18.00, kredensial/secret, DPT (data pribadi).
**Aktor**: pemilih jahat (vote ganda, mengintip), orang luar (menemukan URL), admin IT yang menyalahgunakan akses, device hilang/dicuri, pihak yang menekan pemilih, bug kita sendiri.

## 2. Ancaman dan mitigasi

| ID    | Ancaman                                               | Mitigasi                                                                                                                             | Tes             |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| TH-1  | Vote ganda (klik ganda, request paralel, replay)      | Batch atomik dengan syarat `has_voted=0`; sesi dihapus saat vote                                                                     | T-V2, T-V3      |
| TH-2  | Orang luar membuka URL dan memilih                    | Device terdaftar wajib; akses tanpa token device ditolak; `noindex` hanya pelengkap                                                  | T-A5, T-A8      |
| TH-3  | Akun Google non-DPT atau domain lain masuk            | Verifikasi domain + `email_verified` + whitelist DPT di server                                                                       | T-A1-T-A3       |
| TH-4  | Suara dikaitkan ke pemilih (admin atau pembaca DB)    | `ballots` tanpa identitas/device/waktu, WITHOUT ROWID, id acak, `voted_at` dibulatkan 5 menit, tidak ada JOIN, tidak ada log pilihan | T-S1-T-S3, T-V9 |
| TH-5  | Admin melihat hasil lebih awal                        | Hasil terkunci sampai `closed` + 2 persetujuan admin berbeda; endpoint hasil menolak sebelum itu                                     | T-R1, T-R2      |
| TH-6  | Admin memanipulasi tanpa jejak                        | Audit log append-only (trigger), semua aksi admin dicatat                                                                            | T-AU1, T-AU2    |
| TH-7  | Admin menyuntik suara atau pemilih palsu              | DPT dikunci setelah `published`; rekonsiliasi `ballots = has_voted`; endpoint tulis ballots hanya lewat jalur vote                   | T-ST2, T-V10    |
| TH-8  | Sesi Google pemilih sebelumnya terbawa                | Logout Google di akhir alur, `prompt=select_account`, verifikasi saat dry-run, profil browser kiosk khusus                           | Checklist M-3   |
| TH-9  | Pemilih berikutnya melihat pilihan lewat Back/cache   | `no-store`, sesi dihancurkan, kembali ke awal otomatis                                                                               | T-V9, M-4       |
| TH-10 | Mengintip layar / memotret                            | Sekat privasi, SOP, satu pemilih per device                                                                                          | Checklist M-5   |
| TH-11 | Device hilang atau dicuri                             | Cabut device di admin, efek langsung; token hanya hash                                                                               | T-A8            |
| TH-12 | Brute force kode aktivasi / login admin               | Kode panjang, kedaluwarsa 15 menit, sekali pakai, rate limit, Turnstile                                                              | T-A9            |
| TH-13 | CSRF pada vote/admin                                  | SameSite, cek Origin, token CSRF                                                                                                     | T-X1            |
| TH-14 | Pemilih memilih setelah waktu habis atau sebelum buka | Cek jam server di SQL dan aplikasi                                                                                                   | T-V4            |
| TH-15 | Kebocoran secret atau DPT di repo                     | `.gitignore`, secret hanya di wrangler secrets, pemindaian sebelum push                                                              | Checklist G-6   |
| TH-16 | Layanan eksternal (Google, Cloudflare) gagal          | Tidak ada cadangan kertas: SOP perpanjang/tunda, dry-run, runbook                                                                    | Dry-run         |
| TH-17 | Pemilih memakai kredensial orang lain di device       | Residual: verifikasi fisik di meja registrasi + 2FA akun Google. Check-in digital (FR-21) bila ada waktu                             | n/a             |

**Risiko residual yang diterima** (harus diketahui Pembina): TH-17; admin IT yang punya akses penuh ke infrastruktur Cloudflare secara teoretis dapat mengubah kode (mitigasi: code freeze, review Pembina, audit log, hash berita acara); kompromi Google atau Cloudflare di luar kendali kita.

## 3. Strategi tes

- **Otomatis** (vitest, integrasi D1 lokal; agent memilih pendekatan resmi, mis. pool Workers, dan menjelaskannya): daftar T-* di bawah. Area sensitif wajib punya tes sebelum fase dianggap selesai.
- **Manual** (checklist M-*): dilakukan di staging pada device dan venue asli.
- **Beban ringan**: ≥ 50 vote paralel dari voter berbeda, dan ≥ 20 request vote paralel dari voter yang sama.

## 4. Daftar tes otomatis

**Auth dan device**

- T-A1 email di luar `@student.itera.ac.id` ditolak.
- T-A2 domain benar tetapi tidak ada di DPT ditolak.
- T-A3 `email_verified=false` atau `hd` tidak cocok ditolak.
- T-A4 callback dengan `state` salah/tanpa `state` ditolak.
- T-A5 endpoint voter tanpa token device: 403.
- T-A6 endpoint sesi voter tanpa sesi: 401.
- T-A7 endpoint admin tanpa login 401; dengan sesi voter 403; admin `active=0` 403.
- T-A8 device `revoked` langsung ditolak di request berikutnya.
- T-A9 kode aktivasi dipakai dua kali ditolak; kedaluwarsa ditolak; percobaan berulang kena rate limit.

**Voting**

- T-V1 vote sukses: 1 ballot, `has_voted=1`, `voted_at` kelipatan 5 menit, sesi terhapus.
- T-V2 vote kedua voter yang sama ditolak; ballot tetap 1.
- T-V3 ≥ 20 request vote paralel voter yang sama menghasilkan tepat 1 ballot.
- T-V4 status bukan `open`, sebelum `opens_at`, atau sesudah `closes_at` ditolak.
- T-V5 `candidate_id` dari election lain/tidak ada, atau payload ganda (kandidat + blank) ditolak 400.
- T-V6 blank saat `blank_option_enabled=0` ditolak.
- T-V7 kegagalan di tengah batch tidak meninggalkan ballot tanpa `has_voted` (atau sebaliknya).
- T-V8 sesi kedaluwarsa/idle ditolak.
- T-V9 respons vote tidak memuat pilihan; log tidak memuat candidate id; header `no-store`.
- T-V10 rekonsiliasi: jumlah `ballots` = jumlah `voters.has_voted=1` setelah N vote acak.

**Kerahasiaan**

- T-S1 `PRAGMA table_info(ballots)` tanpa kolom voter/device/waktu; `sqlite_master` memuat `WITHOUT ROWID`.
- T-S2 pemindaian kode: tidak ada query yang menghubungkan `ballots` dengan `voters`/`devices`/sesi.
- T-S3 `voted_at` selalu kelipatan 300000 ms.

**Hasil, state, audit, impor, keamanan**

- T-R1 endpoint hasil per kandidat ditolak sebelum `closed` untuk semua peran, termasuk admin.
- T-R2 `closed` tanpa 2 persetujuan: ditolak; admin yang sama dua kali dihitung satu; 2 admin berbeda + rekonsiliasi cocok: terbuka.
- T-R3 endpoint turnout hanya mengembalikan jumlah dan agregat per jam, tanpa data per kandidat.
- T-R4 hasil sesuai ballot yang diketahui (seed 50 ballot).
- T-ST1 transisi ilegal ditolak (`open→draft`, `closed→open`).
- T-ST2 edit kandidat/DPT saat `published`/`open` ditolak.
- T-AU1 UPDATE/DELETE `audit_log` gagal.
- T-AU2 setiap aksi admin di FR menghasilkan baris audit.
- T-I1 impor: CSV valid masuk; duplikat email/NIM, domain salah, baris kosong dilaporkan; huruf besar dinormalisasi; impor atomik (gagal → tidak ada yang masuk).
- T-X1 header keamanan ada; POST tanpa CSRF/Origin salah ditolak; atribut cookie benar.

## 5. Checklist manual (staging, device dan venue asli)

- M-1 Semua device (tablet dan laptop) berhasil aktivasi dan menjalankan alur penuh.
- M-2 Pemilih bukan DPT ditolak dengan pesan yang jelas.
- M-3 Setelah vote, pemilih berikutnya **tidak** melihat akun Google sebelumnya di pemilih akun/auto-login. Jika terlihat: berhenti, perbaiki alur logout atau SOP browser sebelum go-live.
- M-4 Tombol Back/refresh setelah vote tidak menampilkan pilihan atau sesi.
- M-5 Sekat privasi dan posisi device mencegah layar terlihat dari antrean.
- M-6 Timeout idle bekerja; layar kembali ke awal sendiri.
- M-7 Foto dan teks semua kandidat terbaca jelas dan setara di semua ukuran layar device.
- M-8 Alur pembukaan hasil 2 admin berjalan; ekspor dan berita acara dapat dicetak.
- M-9 Kehilangan jaringan sebentar di tengah vote tidak menghasilkan vote ganda atau vote hilang.

## 6. Acceptance criteria per fase (gate)

Setiap fase selesai hanya jika `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build` lulus dan tes T-* yang tercantum untuk fase itu lulus:

- F2: T-S1, T-S3 (struktur), T-AU1, batasan skema.
- F3: T-A1-T-A4, T-A6, T-A7, T-I1.
- F4: T-A5, T-A8, T-A9.
- F5: T-ST1, T-ST2.
- F6: T-V1-T-V10, T-S2.
- F7: T-R1-T-R4, T-AU2.
- F8: T-X1, beban ringan, seluruh checklist go-live.

## 7. Checklist go-live (G)

- G-1 Seluruh T-* hijau pada commit yang akan di-deploy; commit itu dibekukan (code freeze 18 Nov).
- G-2 Dry-run staging selesai, checklist M-1-M-9 lulus.
- G-3 Database produksi baru, migrasi diterapkan, DPT final diimpor, jumlahnya dicocokkan dengan data panitia.
- G-4 Minimal 2 admin aktif di `admins`; akses diuji.
- G-5 Redirect URI OAuth, Turnstile, dan secret produksi dipasang; OAuth consent screen berstatus _In production_ dengan scope dasar.
- G-6 Repo tidak memuat secret/DPT (pindai riwayat git); `.dev.vars` tidak ter-track.
- G-7 Backup ekspor awal tersimpan di luar Cloudflare.
- G-8 Aturan darurat (SOP bagian 8) disetujui Pembina; kontak darurat terisi di runbook.
- G-9 Seluruh `[PERLU DIPUTUSKAN]` di dokumen sudah diputuskan atau dinyatakan "mengikuti default" secara tertulis.
