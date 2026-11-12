# Panduan Panitia Pemira PMK ITERA 2027

Panduan langkah demi langkah untuk panitia, saksi, dan pembina. Tidak perlu pengetahuan teknis kecuali bagian
yang ditandai **(developer)**.

## Peran

| Peran     | Tugas                                                                                |
| --------- | ------------------------------------------------------------------------------------ |
| Panitia   | Menyusun DPT, memasukkan calon, mengatur jadwal, mengumumkan hasil.                  |
| Petugas   | Menjaga meja dan bilik TPS: cek KTM, absensi, membuat kode TPS.                      |
| Saksi     | Perwakilan setiap calon. Menyaksikan simulasi, penguncian DPT, penutupan, dan rekap. |
| Developer | Deploy aplikasi dan menjalankan perintah teknis. Tidak memegang keputusan pemilihan. |

Ada tiga peran di aplikasi:

- **Super admin**: email di secret `SUPER_ADMIN_EMAILS` (diatur developer). Hanya super admin yang bisa
  mengundang dan mencabut admin serta Petugas TPS lewat menu **Panitia** di panel admin.
- **Admin**: akun Google yang diundang super admin. Admin bisa mengelola jadwal, calon (termasuk foto), DPT,
  dan kode pengecualian, tetapi tidak bisa mengundang admin lain.
- **Petugas TPS**: akun Google yang diundang super admin. Petugas hanya bisa membuat kode TPS dan mengecek
  apakah NIM ada di DPT, di halaman **Petugas**. Petugas tidak bisa membuka panel admin.

Semua masuk lewat **Masuk → "Masuk dengan akun panitia"**. Undangan dan pencabutan tercatat di audit log, dan
akun yang dicabut langsung kehilangan akses.

## Memilih wajib di TPS

Pemilih tidak bisa memilih dari rumah. Surat suara baru terbuka setelah petugas mengetik **kode TPS** di HP
pemilih. Kode TPS sekali pakai, berlaku 2 menit, dan tidak dikaitkan ke NIM. Setelah kode diterima, pemilih
punya 5 menit untuk memilih. Begitu suara masuk, pemilih keluar otomatis 20 detik kemudian.

Alur di TPS:

1. **Meja**: pemilih menunjukkan KTM. Petugas mencocokkannya dengan DPT (bisa lewat **Cek DPT** di halaman
   Petugas) dan meminta tanda tangan absensi.
2. **Area bilik**: pemilih membuka situs di HP-nya sendiri dan masuk dengan akun Google mahasiswanya.
3. Petugas menekan **Buat kode** dan **mengetik kodenya sendiri** di HP pemilih. Jangan menuliskan kode di
   kertas atau mengirimkannya lewat chat.
4. Pemilih memilih sendirian di bilik, lalu menyimpan kode tanda terima (salin atau tangkapan layar).

Pemilih tanpa HP memakai **laptop TPS**. Buka jendela **incognito/penyamaran baru** untuk setiap pemilih dan
tutup setelah dia selesai. Jika tidak ditutup, akun Google pemilih sebelumnya masih terbuka di browser.

Satu meja kira-kira melayani 30 pemilih per jam. Untuk 4.495 pemilih dalam satu hari, siapkan beberapa meja
dan petugas sekaligus.

### Pemilih yang tidak bisa masuk dengan Google

Coba dulu: buka situs di Chrome/Safari (bukan dari dalam WhatsApp/Instagram), atau minta reset akun ke UPA
TIK. Jika akunnya benar-benar tidak bisa dipakai:

1. **Admin pertama → Kode pengecualian**: masukkan NIM (cocokkan nama yang muncul dengan KTM) dan alasannya.
2. **Admin kedua**, dari perangkatnya sendiri, membuka halaman yang sama dan menekan **Setujui**. Kode
   muncul sekali, berlaku 5 menit, dan sekali pakai. Admin yang mengajukan tidak bisa menyetujui
   pengajuannya sendiri.
3. Admin mengetik kode di perangkat pemilih: **Masuk → "Tidak bisa masuk dengan Google?"**.

Semua langkah tercatat di audit log. Setelah pemilihan ditutup, daftar NIM yang memakai jalur ini muncul di
halaman Hasil, tanpa pilihannya. Gunakan jalur ini hanya untuk pengecualian, dan tulis aturannya di tata
tertib sebelum pemilihan.

Foto calon diunggah di menu **Calon** (JPG, PNG, atau WebP; otomatis diperkecil). Seperti data calon
lainnya, foto terkunci begitu pemilihan dibuka, jadi pastikan sudah final sebelum waktu buka.

## Garis waktu

> Situs resmi hanya **pemira.pmkitera.web.id**. Situs uji coba (staging) ditandai pita kuning
> **"Situs uji coba"** di bagian atas dan memakai database terpisah: apa pun yang dilakukan di sana tidak
> memengaruhi pemilihan resmi. Footer setiap situs menyebut database yang dipakai.

### 1. Persiapan (± 2 minggu sebelum hari pemilihan)

1. **Super admin → Panitia**: undang akun Google setiap panitia yang perlu mengelola situs, dan setiap
   Petugas TPS. Kirim pesan undangan yang muncul setelah mengundang.
2. **Susun DPT** dalam spreadsheet dengan kolom `nim` dan `nama`, lalu simpan sebagai CSV. Ekspor data
   kampus boleh langsung dipakai: kolom lain (email, prodi, angkatan, dst.) diabaikan dan tidak disimpan.
   Pemilih dicocokkan lewat NIM di email login `nama.nim@student.itera.ac.id`, jadi kolom email tidak wajib.
   - Berkas DPT adalah **data pribadi**. Jangan dibagikan di grup chat atau diunggah ke tempat publik.
3. **Umumkan DPT sementara** dalam bentuk jumlah pemilih (atau daftar nama tanpa NIM), lalu buka
   **masa sanggah** bagi anggota yang belum terdaftar.
4. Setelah masa sanggah: buka **Admin → DPT**, impor CSV final. Catat **sidik jari DPT (SHA-256)** yang
   muncul dan umumkan bersama jumlah pemilih. Jika DPT diubah diam-diam, sidik jarinya akan berbeda.
5. **Admin → Calon**: masukkan calon beserta nomor urut, visi, misi, dan foto. Minta setiap calon memeriksa
   tulisan dan fotonya di beranda.
6. **Admin → Ringkasan & jadwal**: atur waktu buka dan tutup (WIB).

> Begitu waktu buka tiba, **DPT, daftar calon (termasuk foto), dan jadwal terkunci permanen** oleh database. Pastikan
> semuanya final sebelum itu.

### 2. Simulasi (± 1 minggu sebelumnya, di situs staging)

1. **(developer)** Kosongkan database staging: `pnpm db:reset:staging`.
2. Di situs staging (berpita **"Situs uji coba"**), panitia memasukkan DPT uji (berisi NIM panitia/saksi yang punya email mahasiswa), calon contoh, dan jadwal
   pendek (mis. 30 menit).
3. Panitia dan saksi mencoba alur TPS lengkap: petugas membuat kode TPS, pemilih login di HP sendiri dan
   memilih, menyimpan kode tanda terima, mencoba memilih dua kali (harus ditolak), mencoba kode yang sudah
   lewat 2 menit (harus ditolak), lalu memeriksa kode di halaman Hasil setelah ditutup. Coba juga jalur kode
   pengecualian dengan dua admin.
4. **Gladi login**: login 15–20 akun berturut-turut di laptop TPS, di jaringan kampus, untuk melihat apakah
   Google meminta verifikasi tambahan. Beri tahu UPA TIK bahwa akan ada banyak login dari satu tempat.
5. Uji juga **tutup darurat** di staging, supaya panitia tahu caranya.
6. **(developer)** Kosongkan lagi database staging setelah simulasi.

### 2a. Uji coba publik di situs resmi (Pemira 2027: sampai Rabu, 18 November 2026 pukul 20.00 WIB)

Selama mode uji coba publik menyala, situs resmi menampilkan pita **"Uji coba publik"** di setiap halaman,
dan footer menulis _mode uji coba publik_. Suara yang masuk selama uji tidak dihitung.

1. **Sebelum uji dibuka**, impor **DPT final** dan rapikan calon (profil, visi-misi, foto). Begitu jadwal uji
   dibuka, DPT dan calon terkunci sampai reset. DPT **tidak** dihapus saat reset, jadi sidik jari DPT yang
   diumumkan tetap berlaku untuk hari-H.
2. **(developer)** Nyalakan mode uji coba publik:
   `pnpm wrangler d1 execute pemira-db --remote --file scripts/uji-coba-publik-on.sql`.
3. Atur jadwal uji di **Admin → Ringkasan & jadwal**, lalu publik boleh mencoba alur lengkap.
4. **(developer) Rabu, 18 November 2026 pukul 20.00 WIB:** `pnpm db:reset:uji-coba production`. Skrip
   mencatat bookmark Time Travel, mengarsipkan audit log ke `data/`, menghapus surat suara, tanda sudah
   memilih, kode TPS, kode pengecualian, izin memilih, dan audit log, mengosongkan jadwal, mematikan pita, lalu
   memverifikasi hasilnya. Calon, foto, DPT, admin, dan Petugas TPS tetap. Skrip menolak berjalan bila pita
   sudah mati, jadi tidak mungkin terjalankan saat pemilihan resmi. Latih dulu di staging (lihat komentar di
   `scripts/reset-uji-coba.mjs`).
5. Setelah reset: pastikan pita hilang dan Admin → Ringkasan menunjukkan 0 surat suara, atur **jadwal resmi**,
   lalu minta calon memeriksa ulang halaman beranda.

### 3. Rilis versi final **(developer)**

1. Buat tag rilis, mis. `v1.0.0`, lalu push. GitHub Actions akan men-deploy ke production.
2. Umumkan nomor versi (commit) yang tampil di footer situs. Auditor dapat mencocokkannya dengan kode di
   GitHub.
3. Setelah itu **jangan ada deploy lagi** sampai pemilihan selesai, kecuali darurat dan disaksikan.

### 4. Hari pemilihan

- Pemungutan suara dibuka otomatis sesuai jadwal. Pantau **Admin → Ringkasan**:
  - Jumlah "Sudah memilih" harus selalu sama dengan jumlah "Surat suara". Jika berbeda, muncul peringatan
    merah: hentikan dan periksa bersama saksi.
  - **Rekonsiliasi TPS**: di akhir hari, cocokkan jumlah **kode TPS dipakai** dengan jumlah tanda tangan
    absensi. Jumlah kode dipakai boleh sedikit lebih banyak dari jumlah yang sudah memilih (pemilih yang
    waktunya habis memakai kode baru), tetapi tidak boleh lebih sedikit.
- Ingatkan pemilih untuk **menyimpan kode tanda terima** dan **tidak memberikannya kepada siapa pun**.
- Pemilih yang gagal login: ikuti langkah **Pemilih yang tidak bisa masuk dengan Google** di atas. Pemilih yang
  merasa seharusnya terdaftar: catat NIM, email, dan kendalanya. DPT tidak bisa diubah lagi setelah
  pemungutan suara dibuka.
- **Tutup darurat** (Admin → Ringkasan) hanya jika ada masalah serius, dengan persetujuan saksi. Alasan
  wajib diisi dan tercatat di audit log. Pemungutan suara tidak bisa dibuka kembali.

### 5. Penutupan dan rekapitulasi

1. Pemungutan suara tertutup otomatis sesuai jadwal.
2. Buka halaman **Hasil**. Periksa bersama saksi:
   - perolehan suara setiap calon;
   - tanda ✓ bahwa jumlah surat suara sama dengan jumlah pemilih yang sudah memilih;
   - daftar NIM yang masuk dengan kode pengecualian (jika ada).
3. Di **Admin → Ringkasan**, tekan **Buka audit suara**. Lalu unduh **daftar surat suara (CSV)** dan catat **SHA-256** yang tampil. Lampirkan keduanya pada berita
   acara.
4. Umumkan hasil, tautan halaman Hasil, dan SHA-256. Buka **masa sanggah hasil**: pemilih dapat memeriksa
   kode tanda terimanya di halaman Hasil.

### 6. Setelah masa sanggah

**(developer)** Hapus data identitas pemilih (tabel DPT dan penanda "sudah memilih") lewat migrasi khusus
yang di-commit ke repo, sehingga penghapusannya juga tercatat. Surat suara anonim dan rekap tetap diarsipkan.

## Tata tertib yang disarankan untuk pemilih

- Satu akun, satu suara. Dilarang meminjamkan atau meminjam akun email ITERA.
- Dilarang meminta, membeli, atau memaksa orang lain menunjukkan kode tanda terimanya.
- Kode tanda terima hanya ditampilkan sekali. Simpan baik-baik (catat atau tangkapan layar).
- Memilih hanya di TPS dengan membawa KTM. Kode TPS diketik oleh petugas dan tidak boleh diteruskan.
- Dilarang memotret layar orang lain di area bilik.
