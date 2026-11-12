# Pemira PMK ITERA: panduan untuk agent

E-voting Pemilihan Ketua PMK ITERA periode 2027. Repo ini **publik** supaya bisa diaudit.

- **Hari pemilihan:** Kamis, 19 November 2026, satu hari, **wajib di TPS**. Jam buka/tutup diatur panitia di
  Admin → Ringkasan & jadwal (rencana 07.00–18.00 WIB).
- **Pemilih:** DPT 4.495 NIM (mahasiswa Protestan aktif), sudah diimpor ke production. Pemilih login Google
  di **HP sendiri**; petugas mengetik kode TPS di HP itu. Laptop TPS (jendela incognito per pemilih) hanya
  untuk yang tidak membawa HP.
- **Situs resmi:** https://pemira.pmkitera.web.id. Staging: https://staging.pemira-pmk-itera.pages.dev.

## Sumber kebenaran

1. `migrations/`: aturan pemilihan ditegakkan **trigger SQL**, dan itulah aturan yang berlaku.
2. `docs/developer.md`: arsitektur, peta kode, aturan wajib, lingkungan, alur kerja, jebakan.
3. `docs/panduan-panitia.md`: alur operasional (persiapan, uji coba, hari-H, rekap).
4. `README.md`: prinsip publik, siapa bisa apa, verifikasi hasil, batasan yang diketahui.

Jika kode dan dokumen bertentangan, BERHENTI dan tanyakan pemilik proyek (pilihan ganda). Jangan mengubah
dokumen untuk membenarkan kode, atau sebaliknya, tanpa persetujuan.

## Stack (aktual)

- SvelteKit 3 + Svelte 5 + TypeScript, CSS biasa dengan token di `src/app.css` (tanpa Tailwind).
- Cloudflare **Pages** (`@sveltejs/adapter-cloudflare`), D1 (SQL langsung, tanpa ORM). Foto calon disimpan
  sebagai BLOB di D1 (`candidate_photos`). Tidak ada R2, KV, Turnstile, atau rate limit.
- Auth: Firebase Authentication (popup Google) di browser; ID token diverifikasi di server dengan `jose`
  (`src/lib/server/auth.ts`), disimpan di cookie httpOnly `pemira_session` (maks. 1 jam). `/__/auth/*`
  diproksikan ke firebaseapp.com (`firebase-proxy.ts`).
- Dependency runtime hanya `firebase` dan `jose`. Tooling: pnpm, wrangler, vitest (`node:sqlite` untuk tes).

## Invarian keamanan (sesuai kode saat ini)

1. **Kerahasiaan suara.** `ballots` hanya berisi `(code, candidate_id)`, `WITHOUT ROWID`, primary key =
   kode tanda terima acak 50 bit (CSPRNG, Crockford Base32 `XXXXX-XXXXX`, `receipt.ts`). Tanpa NIM, waktu,
   urutan, atau device. `voted` hanya berisi NIM (tanpa waktu). Jangan tambahkan kolom yang
   menghubungkan keduanya.
2. **Tidak ada penghubung.** Tidak boleh ada query, endpoint, log, audit log, atau export yang meng-JOIN
   `ballots` dengan `voters`/`voted`/`vote_passes`/sesi, atau mengurutkan `ballots` selain berdasarkan kode.
   NIM/email tidak boleh dicatat bersama pilihan atau kode tanda terima. Kode tanda terima ditampilkan sekali
   dan tidak disimpan di sisi pemilih.
3. **Atomik.** `INSERT voted` + `INSERT ballots` dalam satu `db.batch()` (`vote.ts`). Suara ganda ditolak
   oleh primary key `voted.nim`, termasuk request paralel.
4. **Aturan di database.** Jendela waktu (jam D1 `unixepoch()`, bukan klien), wajib izin TPS
   (`vote_passes`), penguncian DPT/calon/foto/jadwal saat dibuka, dan larangan ubah/hapus `ballots`,
   `voted`, `audit_log`, `booth_codes`, `exception_codes` ditegakkan trigger. Aplikasi boleh mengecek lebih
   awal untuk pesan ramah, tetapi jangan memindahkan aturan dari trigger ke kode.
5. **Otorisasi eksplisit, default tolak.** Setiap load dan action memanggil `requireAdmin`,
   `requireSuperAdmin`, atau `requireOfficer` (`admin.ts`); layout saja tidak cukup. Peran dihitung ulang
   setiap request di `hooks.server.ts`. Pemilih = NIM dari email `nama.nim@student.itera.ac.id` yang sudah
   diverifikasi Google, dicocokkan ke `voters.nim`; atau `locals.pass` untuk jalur kode pengecualian.
6. **Izin memilih.** Kode TPS: sekali pakai, 2 menit, tidak terkait NIM. Kode pengecualian: terikat NIM,
   5 menit, sekali pakai; disetujui **dua admin berbeda**, atau dibuat **super admin sendiri** (`solo = 1`,
   migrasi 0007, ditandai di daftar dan audit log). Kode dan token izin hanya disimpan sebagai SHA-256.
7. **Hasil.** Sebelum ditutup, publik hanya melihat angka partisipasi. Begitu fase `closed`, perolehan suara
   per calon **langsung publik tanpa persetujuan**. Pencarian kode dan CSV surat suara + SHA-256 baru
   tampil setelah seorang admin membuka audit suara (`audit_public`, tercatat di audit log).
8. **Data pribadi dan secret** tidak boleh masuk repo: DPT, `data/`, `*.csv`, `*.xlsx`, `.dev.vars`,
   `NOTES.local.md` di-ignore. Tes dan fixture hanya memakai data fiktif.

Batasan yang diterima secara sadar (didokumentasikan di README): tidak ada rate limit, Turnstile, maupun
Content-Security-Policy; kode pengecualian bergantung pada kejujuran admin; pemegang akses langsung D1 bisa
melihat siapa yang sudah memilih (bukan pilihannya) dan secara teknis bisa melepas trigger.

## Status saat ini (per 12 November 2026)

- Production berjalan di tag `v1.0.1-uji` dalam **mode uji coba publik** (`election_config.public_test = 1`):
  setiap halaman berpita "Uji coba publik".
- **Rabu, 18 November 2026 pukul 20.00 WIB:** `pnpm db:reset:uji-coba production`. Skrip ini menghapus data
  pemilihan uji, mematikan pita, dan memverifikasi hasilnya; calon, foto, DPT, admin, dan Petugas TPS
  tetap. Skrip menolak berjalan bila flag sudah mati. Setelah reset: jadwal resmi, lalu **bekukan kode**
  (tidak ada deploy sampai rekap selesai, kecuali darurat dan disaksikan).

## Cara kerja

- Baca struktur repo dan dokumen di atas dulu. Bertanya jika ambigu (pilihan ganda); jangan menebak.
- Branch dari `main` → PR → CI hijau → merge. Production hanya lewat tag `v*`; staging lewat workflow
  _Deploy_ manual. Jangan commit ke `main`, push, atau deploy kecuali diminta.
- Skema: buat migrasi baru `migrations/000N_*.sql`; jangan mengedit migrasi yang sudah diterapkan. Setiap
  aturan database baru diberi tes di `src/lib/server/db/schema.spec.ts` (SQLite asli, trigger ikut teruji).
- Perubahan area sensitif (auth, voting, TPS, hasil, audit, reset) wajib disertai tes.
- Jangan menambah dependency tanpa alasan tertulis.

## Perintah

`pnpm install` · `pnpm dev` (pilih mode: demo/lokal/staging) · `pnpm lint` · `pnpm check` · `pnpm test` ·
`pnpm build` · `pnpm db:reset:local` · `pnpm db:reset:uji-coba <local|staging|production>`
