# Panduan Developer

Konteks untuk developer yang ikut mengerjakan repo ini. Baca bagian [Aturan yang tidak boleh
dilanggar](#aturan-yang-tidak-boleh-dilanggar) sebelum mengubah apa pun yang menyentuh suara atau pemilih.

Cara menjalankan lokal dan daftar perintah ada di [README](../README.md#menjalankan-lokal).

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
- **Siapa boleh masuk**: email `@student.itera.ac.id`, atau admin. Masuk bukan berarti boleh memilih: hak
  pilih ditentukan tabel `voters` (DPT).
- **Peran admin** (`locals.role`, dihitung ulang tiap request di `src/hooks.server.ts`): `super` untuk email
  di secret `SUPER_ADMIN_EMAILS`, `admin` untuk email di tabel `admins` (diundang super admin lewat
  `/admin/panitia`). Pakai `requireAdmin(locals)` atau `requireSuperAdmin(locals)` dari
  `src/lib/server/admin.ts`.
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

| Lokasi                      | Isi                                                                       |
| --------------------------- | ------------------------------------------------------------------------- |
| `migrations/0001_init.sql`  | Skema dan **semua aturan pemilihan** dalam bentuk trigger                 |
| `src/lib/server/vote.ts`    | Status pemilih dan pencatatan suara (`castVote`)                          |
| `src/lib/server/auth.ts`    | Verifikasi Firebase ID token                                              |
| `src/lib/server/access.ts`  | Aturan domain email, NIM dari email, dan admin                            |
| `src/lib/server/admin.ts`   | `requireAdmin`, `requireSuperAdmin`, pencatatan audit log                 |
| `src/lib/server/admins.ts`  | Peran admin (super admin dari secret, admin undangan dari tabel)          |
| `src/lib/server/photos.ts`  | Validasi foto calon                                                       |
| `src/lib/server/results.ts` | Rekap, daftar surat suara, CSV + SHA-256                                  |
| `src/lib/server/dpt.ts`     | Parser CSV DPT dan sidik jari DPT                                         |
| `src/lib/server/testing/`   | SQLite di memori (`node:sqlite`) dengan shim D1 untuk tes                 |
| `src/routes/pilih/`         | Surat suara; kode tanda terima hanya ditampilkan sekali                   |
| `src/routes/hasil/`         | Hasil, pencarian kode, unduhan CSV (404 sebelum pemungutan suara ditutup) |
| `src/routes/admin/`         | Ringkasan & jadwal, tutup darurat, calon + foto, DPT, audit log, panitia  |
| `.github/workflows/`        | CI (lint, check, test, build) dan deploy                                  |

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
   untuk mengelola admin), termasuk action form.
   Layout saja tidak cukup karena action tidak melewati load layout.

Aturan integritas (satu orang satu suara, tidak bisa diubah, penguncian DPT/calon/jadwal saat dibuka)
ditegakkan oleh trigger di database. Kode aplikasi boleh memeriksa lebih awal untuk pesan yang ramah,
tetapi **jangan memindahkan** aturan dari trigger ke kode aplikasi.

## Mengubah skema

- Buat migrasi baru (`migrations/0004_....sql`). **Jangan mengedit** migrasi yang sudah
  diterapkan ke staging/production; D1 tidak akan menjalankannya ulang.
- Setiap aturan baru diberi tes di `src/lib/server/db/schema.spec.ts`. Tes memakai SQLite asli, jadi
  trigger ikut teruji.
- Migrasi diterapkan otomatis oleh workflow deploy sebelum kode baru di-deploy.

## Lingkungan

| Lingkungan | Cara deploy                                      | Database (D1)        | Alamat                                       |
| ---------- | ------------------------------------------------ | -------------------- | -------------------------------------------- |
| Lokal      | `pnpm dev`                                       | D1 lokal (Miniflare) | `http://localhost:5173`                      |
| Staging    | workflow _Deploy_ manual / `pnpm deploy:staging` | `pemira-db-staging`  | `https://staging.pemira-pmk-itera.pages.dev` |
| Production | push tag `v*`                                    | `pemira-db`          | `https://pemira.pmkitera.web.id`             |

- Di Cloudflare Pages, branch `main` adalah production; semua branch lain memakai konfigurasi
  `env.preview` di `wrangler.jsonc` (database staging).
- Variabel `APP_ENV` (`production`/`staging`, di `wrangler.jsonc` pada blok yang sama dengan database-nya)
  ditampilkan di situs: staging dan lokal diberi pita "uji coba" di atas header, dan footer selalu
  menyebut database yang dipakai.
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
- Content-Security-Policy belum dipasang karena popup Firebase memuat script dari `apis.google.com`;
  pasang setelah alur login teruji.

## Data pribadi dan akses

- Repo ini publik. Jangan commit DPT, `.dev.vars`, token, atau data pemilih dalam bentuk apa pun,
  termasuk di tes, fixture, issue, atau deskripsi PR. Pakai data fiktif seperti di `scripts/seed-dev.sql`.
- Akses ke Cloudflare, Firebase, dan Google Cloud diberikan sebagai **member akun** dengan peran
  secukupnya oleh pemegangnya, bukan dengan berbagi token atau password. Minta akses ke pembina.
