# Panduan Developer

Konteks untuk developer yang ikut mengerjakan repo ini. Baca bagian [Aturan yang tidak boleh
dilanggar](#aturan-yang-tidak-boleh-dilanggar) sebelum mengubah apa pun yang menyentuh suara atau pemilih.

Cara menjalankan lokal dan daftar perintah ada di [README](../README.md#menjalankan-lokal).

## Mulai di sini

1. Repo ini publik. Untuk bisa push branch dan membuka PR, minta akses tulis ke pembina.
2. Ikuti [Menjalankan lokal](../README.md#menjalankan-lokal). Isi `SUPER_ADMIN_EMAILS` di `.dev.vars`
   dengan email Google-mu supaya bisa membuka `/admin` di lokal.
3. Baca [Aturan yang tidak boleh dilanggar](#aturan-yang-tidak-boleh-dilanggar) dan
   [Tampilan](#tampilan).
4. Pengembangan lokal **tidak butuh** akses Cloudflare, Firebase, atau Google Cloud. Akses itu hanya untuk
   deploy dan diberikan per orang oleh pemegang akun bila perlu.

## Gambaran arsitektur

```
Browser ──► Cloudflare Pages (SvelteKit, server-side) ──► Cloudflare D1 (SQLite)
   │                     ▲
   └─ Firebase Auth ─────┘  ID token Google diverifikasi di server (jose + JWKS Google)
```

- **Login**: halaman `/masuk` membuka popup Google lewat Firebase Auth, mengambil ID token, lalu langsung
  sign out dari Firebase (persistence di memori saja). Token dikirim ke action `/masuk`, diverifikasi, dan
  disimpan di cookie httpOnly `pemira_session`. Setiap request, `src/hooks.server.ts` memverifikasi ulang
  cookie itu menjadi `locals.user`. Sesi berakhir saat token kedaluwarsa (maks. 1 jam).
- **Siapa boleh masuk**: email `@student.itera.ac.id`, admin, atau Petugas TPS. Masuk bukan berarti boleh memilih: hak
  pilih ditentukan tabel `voters` (DPT).
- **Peran admin** (`locals.role`, dihitung ulang tiap request di `src/hooks.server.ts`): `super` untuk email
  di secret `SUPER_ADMIN_EMAILS`, `admin` untuk email di tabel `admins` (diundang super admin lewat
  `/admin/panitia`). Pakai `requireAdmin(locals)` atau `requireSuperAdmin(locals)` dari
  `src/lib/server/admin.ts`. **Petugas TPS** (`locals.officer`, tabel `officers`) hanya boleh membuka
  `/petugas`; pakai `requireOfficer(locals)`, yang juga menerima super admin (bukan admin biasa). Petugas
  bukan admin: `requireAdmin` menolaknya.
- **Wajib di TPS** (`migrations/0004_tps.sql`, `src/lib/server/tps.ts`): trigger di `voted` menolak suara
  tanpa baris `vote_passes` yang masih berlaku untuk NIM itu, dan menghapus baris itu begitu suara masuk.
  Izin dibuat dengan menukar **kode TPS** (`booth_codes`, sekali pakai, 2 menit, tidak terkait NIM) di action
  `/pilih?/unlock`, atau **kode pengecualian** (`exception_codes`, terikat NIM, dua admin berbeda atau
  super admin sendiri dengan `solo = 1` (`migrations/0007_super_admin_kode.sql`), 5 menit)
  di action `/masuk?/code`. Token acak izin disimpan di cookie httpOnly `pemira_pass` (yang disimpan di
  database hanya hash-nya) dan dibaca di hooks menjadi `locals.pass`. Untuk jalur pengecualian, `locals.pass`
  sekaligus menjadi identitas pemilih (tanpa `locals.user`). Kode hanya disimpan sebagai SHA-256.
- **Foto calon** disimpan di tabel `candidate_photos` (BLOB, maks. 1 MB, diperkecil di browser oleh
  `src/lib/resize-image.ts`) dan disajikan publik di `/foto-calon/[id]`. Jenis berkas diperiksa dari isinya
  (`sniffImageType`), bukan dari nama berkas; SVG ditolak.
- **Identitas pemilih = NIM**: NIM diambil dari email yang sudah diverifikasi Google
  (`nama.nim@student.itera.ac.id`, lihat `nimFromEmail` di `src/lib/server/access.ts`) lalu dicocokkan ke
  `voters.nim`. Email dibuat kampus, jadi NIM di dalamnya dapat dipercaya. DPT dari kampus tidak selalu
  memuat email, sedangkan NIM selalu ada; DPT hanya menyimpan NIM dan nama.
- **Proxy auth**: di domain selain localhost, `authDomain` Firebase diarahkan ke domain situs sendiri dan
  `/__/auth/*` serta `/__/firebase/*` diteruskan ke `pemira-pmk-itera.firebaseapp.com`
  (`src/lib/server/firebase-proxy.ts`). Ini menghindari error _missing initial state_ akibat partisi
  storage di browser. Proxy tidak pernah meneruskan cookie sesi.
- **Akses database**: di SvelteKit 3 binding diambil dari `import { env } from 'cloudflare:workers'`
  (lihat `src/lib/server/db.ts`), bukan dari `platform.env`.

## Peta kode

| Lokasi                         | Isi                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/`                  | Skema dan **aturan pemilihan** (trigger): 0001 dasar, 0002 DPT berbasis NIM, 0003 admin dan foto, 0004 TPS, 0005 audit publik, 0006 uji coba publik, 0007 kode pengecualian super admin, 0008 publikasi hasil, 0009 rincian hasil (persentase saja)     |
| `src/lib/server/vote.ts`       | Status pemilih dan pencatatan suara (`castVote`)                                                                                                                                                                                                        |
| `src/lib/server/tps.ts`        | Kode TPS, kode pengecualian, izin memilih, penghitung rekonsiliasi                                                                                                                                                                                      |
| `src/lib/server/auth.ts`       | Verifikasi Firebase ID token                                                                                                                                                                                                                            |
| `src/lib/server/access.ts`     | Aturan domain email, NIM dari email, dan admin                                                                                                                                                                                                          |
| `src/lib/server/admin.ts`      | `requireAdmin`, `requireSuperAdmin`, pencatatan audit log                                                                                                                                                                                               |
| `src/lib/server/admins.ts`     | Peran admin (super admin dari secret, admin undangan dari tabel)                                                                                                                                                                                        |
| `src/lib/server/photos.ts`     | Validasi foto calon                                                                                                                                                                                                                                     |
| `src/lib/server/candidates.ts` | URL foto per calon                                                                                                                                                                                                                                      |
| `src/lib/resize-image.ts`      | Memperkecil foto di browser sebelum diunggah                                                                                                                                                                                                            |
| `src/lib/components/`          | Komponen tampilan bersama (lihat [Tampilan](#tampilan))                                                                                                                                                                                                 |
| `src/lib/timeline.ts`          | Timeline beranda (#timeline): jadwal Pemira statis; jam yang berlaku tetap `election_config`                                                                                                                                                            |
| `src/lib/kegiatan.ts`          | Galeri rangkaian kegiatan (#kegiatan); foto di `static/dokumentasi/<id>/` (+ `kecil/`)                                                                                                                                                                  |
| `static/video/`                | Video tutorial pemilih di #cara (narasi tertulis di `+page.svelte`); jadwal di video sama dengan `timeline.ts`, render ulang bila berubah (proyek Remotion `video-tutorial/` hanya lokal)                                                               |
| `src/routes/+layout.*`         | Header, footer, pita "uji coba", dan label database                                                                                                                                                                                                     |
| `src/routes/foto-calon/`       | Foto calon (publik, cache panjang lewat URL berversi)                                                                                                                                                                                                   |
| `src/lib/server/results.ts`    | Rekap, daftar surat suara, CSV + SHA-256; persentase (`shownTally`) dan `showsCounts` untuk rincian persentase saja                                                                                                                                     |
| `src/lib/server/dpt.ts`        | Parser CSV DPT dan sidik jari DPT                                                                                                                                                                                                                       |
| `src/lib/server/testing/`      | SQLite di memori (`node:sqlite`) dengan shim D1 untuk tes                                                                                                                                                                                               |
| `src/routes/pilih/`            | Kode TPS, surat suara (5 menit), kode tanda terima sekali tampil, keluar otomatis 20 detik                                                                                                                                                              |
| `src/routes/petugas/`          | Halaman Petugas TPS: buat kode TPS, cek DPT, penghitung kode                                                                                                                                                                                            |
| `src/routes/hasil/`            | Hasil; perolehan hanya bila `resultsVisible` (ditutup, dan mode `auto` atau sudah dipublikasikan); CSV dan pencarian kode (action `periksa`) juga butuh `audit_public`, selain itu 404; rincian `percent`: non-admin hanya menerima persentase, CSV 404 |
| `src/routes/admin/`            | Ringkasan & jadwal + rekonsiliasi TPS, tutup darurat, calon + foto, DPT, kode pengecualian, audit log, panitia (super admin)                                                                                                                            |
| `scripts/reset-uji-coba.*`     | Reset uji coba publik di production (SQL + runner dengan bookmark Time Travel, arsip audit log, verifikasi)                                                                                                                                             |
| `.github/workflows/`           | CI (lint, check, test, build) dan deploy                                                                                                                                                                                                                |

## Aturan yang tidak boleh dilanggar

Kerahasiaan suara bergantung pada **tidak adanya penghubung** antara siapa yang memilih (`voted`) dan apa
yang dipilih (`ballots`). Karena itu:

1. **Jangan tambahkan** timestamp, id berurutan, `rowid`, atau kolom apa pun yang menyimpan urutan ke tabel
   `ballots`. Tabel ini sengaja `WITHOUT ROWID` dengan primary key berupa kode acak.
2. **Jangan pernah mencatat** (log, audit log, pesan error, analytics) NIM/email bersama pilihan calon atau
   kode tanda terima. Kode tanda terima juga tidak disimpan di sisi pemilih (cookie/storage).
3. Penulisan `voted` dan `ballots` **harus tetap dalam satu `db.batch`** (satu transaksi), supaya tidak ada
   surat suara tanpa pemilih atau sebaliknya.
4. Jangan menambah query yang menggabungkan (`JOIN`) `voted` dengan `ballots`, atau mengurutkan `ballots`
   selain berdasarkan kode.
5. Setiap halaman dan action admin wajib memanggil `requireAdmin(locals)` (atau `requireSuperAdmin(locals)`
   untuk mengelola admin, `requireOfficer(locals)` untuk `/petugas`), termasuk action form.
   Layout saja tidak cukup karena action tidak melewati load layout.
6. **Jangan kaitkan kode TPS ke NIM**, dan jangan simpan kode atau token izin dalam bentuk asli. `vote_passes`
   memuat NIM hanya sampai suara masuk; jangan tambahkan kolom yang menyambungkannya ke `ballots`.

Aturan integritas (satu orang satu suara, tidak bisa diubah, penguncian DPT/calon/jadwal saat dibuka)
ditegakkan oleh trigger di database. Kode aplikasi boleh memeriksa lebih awal untuk pesan yang ramah,
tetapi **jangan memindahkan** aturan dari trigger ke kode aplikasi.

## Tampilan

Tampilan memakai motif **surat suara kertas**. Pertahankan arah ini saat menambah halaman:

- **Palet tetap.** Semua warna adalah token di `:root` pada `src/app.css` (`--paper`, `--sand`, `--brown`,
  `--gold`, `--ink`, dst.). Jangan menulis warna baru langsung di komponen.
- **Huruf:** Newsreader untuk judul (miring untuk penekanan, mis. `<em>`), Nunito Sans untuk teks, IBM Plex
  Mono untuk kode tanda terima, hash, dan angka.
- **Komponen bersama** di `src/lib/components/`: `BallotHead` (kepala surat suara), `Guilloche` (pola cetak
  pengaman), `PhaseStamp` (stempel tahap), `Countdown`, `PunchHole` (bekas coblosan), `Gallery` (cetakan foto + lightbox). Logo PMK ITERA: `src/lib/assets/logo-pmk.png` (juga favicon).
- **Kelas global** di `src/app.css`: `.button` (+ `-gold`, `-ghost`, `-danger`), `.sheet` (lembar kertas),
  `.eyebrow`, `.msg-error`/`.msg-ok`, `.rise` (animasi masuk), `.visually-hidden`.
- **Netral terhadap calon.** Jangan pernah menonjolkan atau menandai calon tertentu sebelum hasil diumumkan
  (mis. contoh coblosan di beranda). Urutan selalu berdasarkan nomor urut.
- Uji di lebar HP (390 px), dan pastikan animasi mati saat `prefers-reduced-motion`.

## Mengubah skema

- Buat migrasi baru (`migrations/000N_....sql`). **Jangan mengedit** migrasi yang sudah
  diterapkan ke staging/production; D1 tidak akan menjalankannya ulang.
- Setiap aturan baru diberi tes di `src/lib/server/db/schema.spec.ts`. Tes memakai SQLite asli, jadi
  trigger ikut teruji.
- Migrasi diterapkan otomatis oleh workflow deploy sebelum kode baru di-deploy.

## Lingkungan

| Lingkungan | Cara deploy                                      | Database (D1)        | Alamat                                       |
| ---------- | ------------------------------------------------ | -------------------- | -------------------------------------------- |
| Lokal      | `pnpm dev demo` / `pnpm dev local`               | D1 lokal (Miniflare) | `http://localhost:5173`                      |
| Dev remote | `pnpm dev staging` (server lokal)                | `pemira-db-staging`  | `http://localhost:5173`                      |
| Staging    | workflow _Deploy_ manual / `pnpm deploy:staging` | `pemira-db-staging`  | `https://staging.pemira-pmk-itera.pages.dev` |
| Production | push tag `v*`                                    | `pemira-db`          | `https://pemira.pmkitera.web.id`             |

- `pnpm dev staging` memakai binding `remote: true` di `env.preview` (`wrangler.jsonc`), jadi server lokal
  membaca dan menulis database staging di Cloudflare. Production tidak pernah dipakai dari server lokal.
- **Mode demo** (`pnpm dev demo`): `src/lib/server/demo.ts` mengaktifkan login impersonate dan super admin
  `ketua.panitia@example.com` hanya jika `dev` dan `__DEV_MODE__ === 'demo'` (diatur `vite.config.ts` dari
  `PEMIRA_DEV_MODE`, selalu `'local'` saat build). Jangan memakai saklar lain untuk fitur demo.
- Di Cloudflare Pages, branch `main` adalah production; semua branch lain memakai konfigurasi
  `env.preview` di `wrangler.jsonc` (database staging).
- Variabel `APP_ENV` (`production`/`staging`, di `wrangler.jsonc` pada blok yang sama dengan database-nya)
  ditampilkan di situs: staging dan lokal diberi pita "uji coba" di atas header, dan footer selalu
  menyebut database yang dipakai. Production diberi pita "Uji coba publik" selama
  `election_config.public_test = 1` (migrasi 0006); flag ini hanya dimatikan oleh
  `scripts/reset-uji-coba.sql`.
- Pengaman GitHub: ruleset "Lindungi main" (wajib PR + CI `verify`, tanpa force push atau hapus) dan
  environment `production` yang hanya menerima tag `v*` serta menunggu persetujuan (_Required reviewers_)
  sebelum migrasi dan deploy berjalan. Setelah push tag, buka tab Actions dan klik _Review deployments_.
- GitHub Actions memakai `CLOUDFLARE_API_TOKEN` (Pages Edit + D1 Edit) dan `CLOUDFLARE_ACCOUNT_ID`
  sebagai secret environment `production` dan `staging`, bukan secret repo. Di `deploy.yml` token hanya
  dipasang di langkah wrangler (migrasi dan deploy), bukan di install, tes, atau build.
- Deploy manual (darurat, dari komputer yang sudah `wrangler login`, kode bersih tanpa perubahan):
  ```sh
  pnpm build && pnpm wrangler pages deploy --branch main --commit-hash "$(git rev-parse HEAD)" --commit-dirty=false
  ```
  Ganti `main` dengan `staging` untuk staging. Jalankan migrasi lebih dulu bila ada migrasi baru.
- Secret diatur per lingkungan, tidak pernah di repo:
  ```sh
  pnpm wrangler pages secret put SUPER_ADMIN_EMAILS                 # production
  pnpm wrangler pages secret put SUPER_ADMIN_EMAILS --env preview   # staging
  ```
  Untuk lokal, salin `.dev.vars.example` menjadi `.dev.vars`.
- Pemeriksaan origin (CSRF) SvelteKit hanya aktif di hasil build. Untuk menguji perilaku production secara
  lokal, pakai `pnpm build && pnpm preview`.
- Jika login perlu diuji di domain baru, domain itu harus ditambahkan oleh pemegang akun ke _Authorized
  domains_ Firebase dan redirect URI `https://<domain>/__/auth/handler` di OAuth client Google.

## Alur kerja

1. Buat branch dari `main`, kerjakan, jalankan `pnpm lint && pnpm check && pnpm test`.
2. Buka PR. CI harus hijau sebelum merge.
3. Uji di staging untuk perubahan yang menyentuh login, surat suara, atau admin.
4. Rilis ke production hanya dengan tag versi. Versi (commit) yang berjalan tampil di footer situs.
5. **Bekukan kode** sejak rilis final sampai rekapitulasi selesai. Deploy saat pemilihan berjalan hanya
   untuk keadaan darurat dan disaksikan panitia/saksi (lihat [panduan panitia](panduan-panitia.md)).

## Jebakan yang pernah terjadi

- `.gitignore` mengabaikan `*.csv` (agar DPT tidak ter-commit). Endpoint `src/routes/hasil/surat-suara.csv/`
  dikecualikan secara eksplisit; jika menambah route berakhiran `.csv`, tambahkan pengecualian juga.
- `worker-configuration.d.ts` dibuat ulang oleh `wrangler types` sebelum `check`/`build` dan tidak
  di-commit. Jalankan `pnpm gen` setelah mengubah `wrangler.jsonc`.
- ESLint mewajibkan `resolve()` dari `$app/paths` untuk semua `href` dan `goto` internal.
- SvelteKit 3: flag `dev` ada di `$app/env` (bukan `$app/environment`), dan tipe `SubmitFunction` diimpor
  dari `$app/forms`.
- Svelte 5 menulis ulang selector bertingkat dengan `:where(...)`, sehingga gaya lokal halaman admin bisa
  kalah oleh `:global(...)` di `src/routes/admin/+layout.svelte`. Naikkan spesifisitas (mis.
  `form.panel.cand`) bila gaya tidak berlaku.
- `src/hooks.server.ts` membaca tabel `admins` dan `officers` (satu query) di setiap request dari pengguna
  yang login, dan `vote_passes` jika ada cookie izin. Query ini kecil, tetapi jangan menambah query berat di
  hooks.
- `/masuk` dan `/pilih` memakai named action (`?/google`, `?/code`, `?/unlock`, `?/vote`); SvelteKit
  melarang mencampur action `default` dengan named action.
- Setelah suara masuk, `/pilih` memakai `applyAction` (bukan `update()`): izin, dan untuk jalur pengecualian
  juga sesinya, sudah habis, sehingga memuat ulang halaman akan mengalihkan ke `/masuk` dan tanda terima
  hilang.
- `scripts/reset-uji-coba.sql` melepas lalu membuat ulang beberapa trigger (hapus `ballots`/`voted`/
  `audit_log`/`booth_codes`/`exception_codes` dan `election_config_lock_schedule`) dengan teks yang sama
  persis dengan migrasi terakhir. Jika migrasi baru mengubah trigger itu, perbarui skrip reset juga;
  `src/lib/server/db/reset-uji-coba.spec.ts` akan gagal bila skemanya berbeda.
- Content-Security-Policy belum dipasang karena popup Firebase memuat script dari `apis.google.com`;
  pasang setelah alur login teruji.

## Data pribadi dan akses

- Repo ini publik. Jangan commit DPT, `.dev.vars`, token, atau data pemilih dalam bentuk apa pun,
  termasuk di tes, fixture, issue, atau deskripsi PR. Pakai data fiktif seperti di `scripts/seed-dev.sql`.
- Akses ke Cloudflare, Firebase, dan Google Cloud diberikan sebagai **member akun** dengan peran
  secukupnya oleh pemegangnya, bukan dengan berbagi token atau password. Minta akses ke pembina.
