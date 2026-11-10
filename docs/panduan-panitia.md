# Panduan Panitia Pemira PMK ITERA 2027

Panduan langkah demi langkah untuk panitia, saksi, dan pembina. Tidak perlu pengetahuan teknis kecuali bagian
yang ditandai **(developer)**.

## Peran

| Peran     | Tugas                                                                                |
| --------- | ------------------------------------------------------------------------------------ |
| Panitia   | Menyusun DPT, memasukkan calon, mengatur jadwal, mengumumkan hasil.                  |
| Saksi     | Perwakilan setiap calon. Menyaksikan simulasi, penguncian DPT, penutupan, dan rekap. |
| Developer | Deploy aplikasi dan menjalankan perintah teknis. Tidak memegang keputusan pemilihan. |

Ada dua peran admin aplikasi:

- **Super admin**: email di secret `SUPER_ADMIN_EMAILS` (diatur developer). Hanya super admin yang bisa
  mengundang dan mencabut admin lewat menu **Panitia** di panel admin.
- **Admin**: akun Google yang diundang super admin. Admin bisa mengelola jadwal, calon (termasuk foto), dan
  DPT, tetapi tidak bisa mengundang admin lain.

Semua admin masuk lewat **Masuk → "Masuk dengan akun panitia"**. Undangan dan pencabutan tercatat di audit
log, dan admin yang dicabut langsung kehilangan akses.

Foto calon diunggah di menu **Calon** (JPG, PNG, atau WebP; otomatis diperkecil). Seperti data calon
lainnya, foto terkunci begitu pemilihan dibuka, jadi pastikan sudah final sebelum waktu buka.

## Garis waktu

> Situs resmi hanya **pemira.pmkitera.web.id**. Situs uji coba (staging) ditandai pita kuning
> **"Situs uji coba"** di bagian atas dan memakai database terpisah: apa pun yang dilakukan di sana tidak
> memengaruhi pemilihan resmi. Footer setiap situs menyebut database yang dipakai.

### 1. Persiapan (± 2 minggu sebelum hari pemilihan)

1. **Super admin → Panitia**: undang akun Google setiap panitia yang perlu mengelola situs. Kirim pesan
   undangan yang muncul setelah mengundang.
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
3. Panitia dan saksi mencoba: login, memilih, menyimpan kode tanda terima, mencoba memilih dua kali (harus
   ditolak), lalu memeriksa kode di halaman Hasil setelah ditutup.
4. Uji juga **tutup darurat** di staging, supaya panitia tahu caranya.
5. **(developer)** Kosongkan lagi database staging setelah simulasi.

### 3. Rilis versi final **(developer)**

1. Buat tag rilis, mis. `v1.0.0`, lalu push. GitHub Actions akan men-deploy ke production.
2. Umumkan nomor versi (commit) yang tampil di footer situs. Auditor dapat mencocokkannya dengan kode di
   GitHub.
3. Setelah itu **jangan ada deploy lagi** sampai pemilihan selesai, kecuali darurat dan disaksikan.

### 4. Hari pemilihan

- Pemungutan suara dibuka otomatis sesuai jadwal. Pantau **Admin → Ringkasan**:
  - Jumlah "Sudah memilih" harus selalu sama dengan jumlah "Surat suara". Jika berbeda, muncul peringatan
    merah: hentikan dan periksa bersama saksi.
- Ingatkan pemilih untuk **menyimpan kode tanda terima** dan **tidak memberikannya kepada siapa pun**.
- Pemilih yang gagal login atau merasa seharusnya terdaftar: catat NIM, email, dan kendalanya. DPT tidak bisa
  diubah lagi setelah pemungutan suara dibuka.
- **Tutup darurat** (Admin → Ringkasan) hanya jika ada masalah serius, dengan persetujuan saksi. Alasan
  wajib diisi dan tercatat di audit log. Pemungutan suara tidak bisa dibuka kembali.

### 5. Penutupan dan rekapitulasi

1. Pemungutan suara tertutup otomatis sesuai jadwal.
2. Buka halaman **Hasil**. Periksa bersama saksi:
   - perolehan suara setiap calon;
   - tanda ✓ bahwa jumlah surat suara sama dengan jumlah pemilih yang sudah memilih.
3. Unduh **daftar surat suara (CSV)** dan catat **SHA-256** yang tampil. Lampirkan keduanya pada berita
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
