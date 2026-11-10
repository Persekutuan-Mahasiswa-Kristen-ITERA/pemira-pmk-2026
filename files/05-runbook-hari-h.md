# 05. Runbook Hari H

Pemilihan: **Kamis, 19 November 2026, 07.00-18.00 WIB**. Dokumen ini dipakai langsung oleh panitia IT. Aturan keputusan ada di `02-aturan-pemilu-sop.md`.

## Peran dan kontak (isi sebelum H-1)

| Peran                                       | Nama    | Kontak  |
| ------------------------------------------- | ------- | ------- |
| Koordinator IT                              | `[isi]` | `[isi]` |
| Admin IT 1                                  | `[isi]` | `[isi]` |
| Admin IT 2                                  | `[isi]` | `[isi]` |
| Bapak Pembina (penyetuju keputusan darurat) | `[isi]` | `[isi]` |
| Ketua panitia / meja registrasi             | `[isi]` | `[isi]` |
| Pemilik repo/Cloudflare                     | `[isi]` | `[isi]` |

## H-1 (Rabu, 18 November)

1. Pastikan commit rilis sudah code freeze dan semua tes lulus (G-1).
2. Buat database produksi baru, terapkan migrasi, impor DPT final dari panitia. Cocokkan jumlah baris dengan data panitia (G-3).
3. Daftarkan minimal 2 admin aktif dan uji login keduanya (G-4).
4. Isi kandidat (nomor urut, foto, visi-misi-program) dari panitia; tinjau tampilan bersama panitia dan Pembina; ubah status ke `published`.
5. Pasang secret produksi, redirect URI OAuth, Turnstile (G-5). Jangan mengubah kode lagi.
6. Ekspor backup awal (DPT tanpa pilihan) dan simpan di luar Cloudflare (G-7).
7. Siapkan device: baterai penuh, charger, browser dengan profil kiosk khusus (tanpa ekstensi, tanpa penyimpanan password, popup dimatikan), sekat privasi.
8. **Jangan mencoba voting di produksi.** Uji coba suara hanya di staging.

## Hari H, sebelum buka

| Waktu | Tindakan                                                                                                                                             |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 06.00 | Atur venue: meja registrasi, device dengan sekat privasi, jaringan stabil, cadangan hotspot                                                          |
| 06.30 | Admin membuat device di admin; buat kode aktivasi **saat akan dipakai** (berlaku 15 menit); aktivasi tiap device                                     |
| 06.45 | Uji tanpa memberikan suara: `/api/health` OK; halaman kiosk memuat kandidat dan foto; login akun non-DPT ditolak; semua device tampil aktif di admin |
| 06.55 | Briefing petugas registrasi dan IT; pastikan 2 admin hadir dan Pembina dapat dihubungi                                                               |
| 07.00 | Admin mengubah status ke `open`; pastikan turnout menampilkan 0 dari total DPT dan device pertama berhasil dipakai oleh pemilih sungguhan            |

## Selama pemilihan

- Pantau turnout dan status device (`last_seen_at`) tiap jam. Catat angka turnout di log insiden.
- Petugas memastikan satu pemilih per device, layar kembali ke awal, dan sekat privasi terpasang.
- Pada pergantian pemilih, petugas memeriksa bahwa layar login tidak menampilkan akun Google sebelumnya (checklist M-3). Jika terlihat, hentikan device itu dan cabut dari admin sampai diperbaiki.
- Tidak ada yang membuka database langsung. Tidak ada yang mencoba melihat hasil.
- Jangan mengubah kode atau melakukan deploy selama `open`.

## Penanganan insiden

| Gejala                                            | Tindakan                                                                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Satu device mati/hang                             | Cabut device, aktivasi ulang di device lain dengan kode baru; pemilih yang sesinya terputus mengulang login (jika belum tercatat memilih) |
| Pemilih ditolak "tidak terdaftar"                 | Periksa ejaan email di DPT cetak/data panitia; DPT tidak bisa diubah saat `open`, eskalasi ke Pembina                                     |
| Pemilih ditolak "sudah memilih" tetapi menyangkal | Catat nama, waktu, device; jangan menghapus atau mengubah apa pun; eskalasi ke Pembina                                                    |
| Login Google gagal massal                         | Cek status Google/Cloudflare; coba dari jaringan lain; jika > 15 menit, minta keputusan Pembina: perpanjang `closes_at` atau tunda        |
| Error 5xx berulang                                | Cek dashboard Cloudflare (Workers, D1); jangan deploy; hubungi pemilik repo; keputusan perpanjang/tunda ke Pembina                        |
| Device hilang/dicuri                              | Cabut device seketika; catat                                                                                                              |
| Antrean masih panjang menjelang 18.00             | Sebelum 18.00, Pembina memutuskan perpanjangan; admin mengubah `closes_at` (tercatat)                                                     |
| Dugaan pelanggaran                                | Hentikan alur terkait, amankan audit log, lapor Pembina. Audit log tidak dapat dihapus                                                    |

Setiap insiden dicatat: waktu, gejala, tindakan, siapa yang memutuskan.

## Penutupan (setelah 18.00 atau waktu perpanjangan)

1. Pastikan tidak ada pemilih aktif di device; sistem otomatis menolak suara baru.
2. Admin menekan **Tutup pemilu** dengan konfirmasi → status `closed`. Tidak ada pembukaan kembali.
3. Jalankan rekonsiliasi: jumlah ballot harus sama dengan jumlah pemilih berstatus sudah memilih. **Jika tidak sama: jangan buka hasil**, lapor ke Pembina.
4. Ekspor backup (status DPT, audit log) dan simpan di luar Cloudflare.
5. Cabut seluruh device.

## Pembukaan hasil

1. Kumpulkan Admin IT 1, Admin IT 2, dan Bapak Pembina/saksi di satu tempat.
2. Admin IT 1 menyetujui pembukaan, lalu Admin IT 2 menyetujui (admin berbeda). Persetujuan tercatat otomatis.
3. Tampilkan hasil kepada Pembina/panitia. Ekspor CSV hasil dan halaman berita acara; catat hash SHA-256.
4. Cetak berita acara dan tanda tangani oleh panitia dan Pembina.
5. Pengumuman dilakukan oleh panitia, bukan oleh admin sendiri.

## Setelah pemilu

- Simpan arsip: berita acara, ekspor hasil, audit log, log insiden.
- Masa sengketa mengikuti SOP bagian 9. Setelah itu hapus data pribadi DPT sesuai keputusan retensi (O-7).
- Lakukan evaluasi singkat: hal yang berjalan baik, masalah, perbaikan untuk pemilu berikutnya.
