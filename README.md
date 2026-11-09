# Pemira PMK ITERA 2027

Aplikasi e-voting untuk **Pemilihan Ketua PMK ITERA 2027**. Kode sumbernya terbuka supaya siapa pun
bisa mengaudit cara suara dicatat dan dihitung.

## Prinsip

| Prinsip               | Penerapan                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Hanya pemilih sah     | Login Google dengan email `@student.itera.ac.id` yang terdaftar di DPT (mahasiswa Kristen aktif).                                     |
| Satu orang satu suara | Email hanya bisa tercatat sekali; penanda "sudah memilih" dan surat suara disimpan dalam satu transaksi.                              |
| Rahasia               | Identitas (`voted`) dan isi suara (`ballots`) disimpan terpisah tanpa penghubung, tanpa timestamp, tanpa urutan.                      |
| Bisa diverifikasi     | Setiap pemilih mendapat kode tanda terima acak. Setelah ditutup, daftar `kode → calon` dipublikasikan untuk dicek dan dihitung ulang. |
| Tidak bisa diubah     | Surat suara, penanda sudah memilih, dan audit log tidak bisa diubah/dihapus. DPT, calon, dan jadwal terkunci saat pemilihan dibuka.   |

Aturan-aturan ini ditegakkan **di database** lewat trigger SQL, bukan hanya di kode aplikasi.
Lihat [`migrations/0001_init.sql`](migrations/0001_init.sql) dan tesnya di
[`src/lib/server/db/schema.spec.ts`](src/lib/server/db/schema.spec.ts).

## Batasan yang diketahui

Kami mencantumkan batasan sistem secara terbuka:

- **Pemegang akses akun Cloudflare** secara teori bisa memakai fitur _Time Travel_ D1 (pemulihan database
  ke titik waktu tertentu) untuk mencocokkan urutan masuknya surat suara dengan penanda "sudah memilih".
  Karena itu, akses akun Cloudflare dibatasi dan setiap akses ke database production harus disaksikan.
- **E-voting jarak jauh** tidak bisa mencegah pemilih ditekan atau diawasi saat memilih, atau meminjamkan
  akunnya. Hal ini diatur lewat tata tertib panitia.
- **Kode tanda terima** bisa dipakai pemilih untuk menunjukkan pilihannya kepada orang lain. Meminta kode
  tanda terima orang lain dilarang oleh tata tertib.

## Teknologi

- [SvelteKit](https://svelte.dev/docs/kit) di [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) sebagai database
- [Firebase Authentication](https://firebase.google.com/docs/auth) untuk login Google; token diverifikasi di server dengan [jose](https://github.com/panva/jose)

## Menjalankan lokal

Prasyarat: Node.js 22.13+ (untuk `node:sqlite` di tes) dan [pnpm](https://pnpm.io).

```sh
pnpm install
cp .dev.vars.example .dev.vars   # secret lokal, tidak di-commit
pnpm db:reset:local              # buat database lokal + jalankan migrasi
pnpm db:seed:local               # opsional: data contoh (fiktif) dan buka jendela pemilihan 7 hari
pnpm dev
```

## Perintah

| Perintah              | Fungsi                                                       |
| --------------------- | ------------------------------------------------------------ |
| `pnpm dev`            | Server pengembangan                                          |
| `pnpm test`           | Tes unit, termasuk tes aturan database                       |
| `pnpm check`          | Pemeriksaan tipe                                             |
| `pnpm lint`           | Prettier + ESLint                                            |
| `pnpm build`          | Build untuk Cloudflare Workers                               |
| `pnpm gen`            | Buat ulang tipe Cloudflare setelah mengubah `wrangler.jsonc` |
| `pnpm db:reset:local` | Hapus dan buat ulang database D1 lokal                       |
| `pnpm db:seed:local`  | Isi database lokal dengan data contoh                        |

## Struktur

```
migrations/          Skema D1 + aturan (trigger) pemilihan
scripts/seed-dev.sql Data contoh untuk pengembangan lokal
src/lib/server/      Kode yang hanya berjalan di server (akses database, logika pemilihan)
src/routes/          Halaman: beranda, /masuk, /pilih (surat suara), /keluar
wrangler.jsonc       Konfigurasi Cloudflare Worker dan binding D1
```

## Data pribadi dan secret

Repo ini publik. **Jangan pernah meng-commit** daftar pemilih (DPT), file `.dev.vars`, atau kredensial apa pun.
DPT diimpor langsung ke D1 oleh panitia; secret diatur dengan `wrangler secret put`.
