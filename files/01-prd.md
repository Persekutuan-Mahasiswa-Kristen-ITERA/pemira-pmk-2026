# 01. PRD: Pemira PMK ITERA

## 1. Ringkasan

Website e-voting untuk pemilihan Ketua Umum Persekutuan Mahasiswa Kristen (PMK) ITERA. Pemilih memberikan suara di lokasi, memakai device milik panitia, setelah identitas fisik diverifikasi di meja registrasi. Tujuan utama bukan sekadar "alat coblos online", tetapi sistem yang membuat hasil pemilu **dapat dipercaya**: pemilih sah, suara rahasia, hasil terkunci sampai penutupan, dan semua aksi admin tercatat.

## 2. Tujuan dan non-tujuan

**Tujuan**

1. Hanya pemilih di DPT yang dapat memilih, tepat satu kali.
2. Suara rahasia: tidak ada jalur teknis untuk menghubungkan suara ke pemilih.
3. Hasil tidak terlihat oleh siapa pun sebelum pemilihan ditutup dan dibuka dengan persetujuan 2 admin.
4. Semua aksi admin tercatat di audit log yang tidak dapat diubah.
5. Panitia bisa menyiapkan, menjalankan, dan menutup pemilu tanpa bantuan developer di hari H.

**Non-tujuan**: pemilu multi-posisi, voting dari HP/di luar lokasi, kampanye online, notifikasi email/WhatsApp.

## 3. Konteks operasional

- Tanggal: Kamis, 19 November 2026, 07.00-18.00 WIB (ditegakkan di server).
- Lokasi: venue panitia. Device: tablet dan laptop, 5-9 unit, milik panitia, terdaftar di sistem.
- Pemilih: mahasiswa Kristen ITERA di DPT (CSV dari panitia). Perkiraan ~700 (tahun lalu maksimal 700), kapasitas desain 5.000.
- URL tidak dipublikasikan (`noindex`), tetapi keamanan bergantung pada registrasi device, bukan kerahasiaan URL.
- Tidak ada surat suara kertas. Rencana darurat ada di SOP (perpanjangan atau penundaan).
- Tim: pemilik proyek dan Bapak Pembina (reviewer dan penyetuju). Domain disediakan Pembina; fallback `*.workers.dev`.

## 4. Persona

| Persona                        | Kebutuhan                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Pemilih**                    | Alur sederhana: login Google, lihat kandidat, pilih, konfirmasi, selesai. Yakin suaranya rahasia |
| **Petugas meja registrasi**    | Memverifikasi identitas fisik (di luar sistem) lalu mengarahkan pemilih ke device                |
| **Admin IT (minimal 2 orang)** | Menyiapkan pemilu, impor DPT, kelola device, pantau turnout, tutup pemilu, buka hasil            |
| **Bapak Pembina / saksi**      | Menyaksikan pembukaan hasil, menyetujui aturan darurat, menerima berita acara                    |
| **Kandidat**                   | Profil (foto, visi, misi, program) ditampilkan adil dan setara                                   |

## 5. Persyaratan fungsional

Prioritas: **P0** wajib untuk go-live, **P1** diusahakan, **P2** hanya jika ada waktu.

| ID    | Persyaratan                                                                                                          | Prio |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ---- |
| FR-01 | Impor DPT dari CSV (preview, validasi, laporan error, atomik). Email dinormalisasi lowercase                         | P0   |
| FR-02 | Login Google OAuth; hanya `@student.itera.ac.id`; email harus ada di DPT, jika tidak akses ditolak                   | P0   |
| FR-03 | Registrasi device lewat kode aktivasi sekali pakai dari admin; admin dapat mencabut device                           | P0   |
| FR-04 | Seluruh endpoint voter hanya melayani device aktif, terdaftar, dan belum dicabut                                     | P0   |
| FR-05 | Halaman kiosk: daftar kandidat (foto, nomor urut, visi-misi-program), opsi kotak kosong bila kandidat tunggal        | P0   |
| FR-06 | Layar konfirmasi sebelum submit; setelah submit sesi dihancurkan dan layar kembali ke awal otomatis                  | P0   |
| FR-07 | Voting atomik, satu pemilih satu suara, aman terhadap request ganda/paralel                                          | P0   |
| FR-08 | Suara rahasia: `ballots` tanpa identitas pemilih, device, dan waktu                                                  | P0   |
| FR-09 | State machine pemilu: `draft → published → open → closed → results_published`                                        | P0   |
| FR-10 | Voting hanya sah di jendela waktu 07.00-18.00 WIB tanggal pemilu, divalidasi jam server                              | P0   |
| FR-11 | Admin: kelola kandidat (draft saja), foto ke R2                                                                      | P0   |
| FR-12 | Dashboard turnout: jumlah dan persentase yang sudah memilih, grafik per jam dari `voted_at`. Tanpa data per kandidat | P0   |
| FR-13 | Hasil per kandidat terkunci sampai `closed`, lalu dibuka dengan persetujuan 2 admin berbeda                          | P0   |
| FR-14 | Audit log append-only untuk aksi admin dan kejadian keamanan                                                         | P0   |
| FR-15 | Timeout idle dan batas durasi sesi voter; header `no-store`; tombol Back tidak menampilkan ulang pilihan             | P0   |
| FR-16 | Rate limiting, Turnstile pada aktivasi device, CSRF protection                                                       | P0   |
| FR-17 | Ekspor hasil (CSV) dan halaman berita acara siap cetak dengan hash SHA-256                                           | P1   |
| FR-18 | Ekspor backup status DPT (tanpa pilihan) berkala                                                                     | P1   |
| FR-19 | Rekonsiliasi otomatis: jumlah `ballots` = jumlah `voters.has_voted=1`                                                | P1   |
| FR-20 | Mode staging terpisah (D1 terpisah) untuk dry-run                                                                    | P0   |
| FR-21 | Check-in digital di meja registrasi                                                                                  | P2   |

## 6. Persyaratan non-fungsional

- **Keamanan**: lihat `04-threat-model-test-plan.md`. Otorisasi eksplisit di tiap endpoint.
- **Ketersediaan**: target 100% selama 07.00-18.00; tidak ada cadangan kertas, sehingga dry-run di device dan venue asli wajib.
- **Kinerja**: ≥ 50 vote paralel tanpa error; halaman kiosk dimuat < 3 detik di jaringan venue.
- **UI**: dioptimalkan untuk layar tablet/laptop landscape, target klik besar, tanpa fitur yang tidak perlu. Bukan mobile-first.
- **Privasi**: data DPT hanya dipakai untuk pemilu ini; retensi diatur di SOP.

## 7. Di luar scope

Email/WhatsApp, Q&A kandidat, kuorum otomatis, TPS offline, bukti memilih per pemilih, voting jarak jauh, multi-pemilu.

## 8. Kriteria sukses

1. Dry-run di venue asli dengan semua device: seluruh checklist `04` lulus.
2. Hari H: tidak ada vote ganda, rekonsiliasi `ballots = has_voted` cocok, tidak ada insiden kebocoran suara.
3. Hasil dibuka sesuai SOP dengan berita acara yang ditandatangani Pembina.

## 9. Keputusan final

Stack Astro + Cloudflare; satu posisi (Ketua Umum), kandidat individu; voting di device terdaftar; Google OAuth dengan whitelist DPT; admin hanya divisi IT; hasil terkunci sampai `closed` dengan persetujuan 2 admin; `voted_at` ada di `voters` (dibulatkan 5 menit); tanpa kertas.

## 10. Keputusan terbuka

| ID  | Pertanyaan                                                                   | Usulan default                                                                                 |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| O-1 | Format CSV DPT (nama kolom, apakah email sudah `@student.itera.ac.id` semua) | Parser dengan pemetaan kolom; baris tidak valid dilaporkan, tidak diimpor diam-diam            |
| O-2 | Kandidat tunggal: syarat menang melawan kotak kosong                         | Menang jika suara kandidat > suara kotak kosong; jika tidak, ikuti AD/ART `[PERLU DIPUTUSKAN]` |
| O-3 | Aturan seri antar kandidat                                                   | Ikuti AD/ART; sistem hanya melaporkan seri `[PERLU DIPUTUSKAN]`                                |
| O-4 | Domain produksi                                                              | Dari Pembina, paling lambat 11 Nov; fallback `*.workers.dev`                                   |
| O-5 | Nama minimal 2 admin IT dan pihak yang menyaksikan pembukaan hasil           | Admin IT ×2, Pembina sebagai saksi                                                             |
| O-6 | Siapa berwenang memperpanjang waktu atau menunda                             | Bapak Pembina, dicatat di audit log dan berita acara                                           |
| O-7 | Retensi data DPT setelah pemilu                                              | Hapus data pribadi DPT N hari setelah masa sengketa; simpan hasil agregat `[PERLU DIPUTUSKAN]` |
