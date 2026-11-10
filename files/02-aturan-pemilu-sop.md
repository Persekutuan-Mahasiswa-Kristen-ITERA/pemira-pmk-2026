# 02. Aturan Pemilu dan SOP

> Dokumen ini memuat aturan teknis-operasional sistem. Dasar organisasi (AD/ART PMK ITERA, SK panitia) harus dicantumkan oleh panitia: `[PERLU DIPUTUSKAN: nomor dan pasal rujukan]`. Jika AD/ART bertentangan dengan dokumen ini, AD/ART yang berlaku dan sistem disesuaikan.

## 1. Hak pilih

1. Pemilih adalah mahasiswa Kristen ITERA yang tercantum di DPT final dari panitia.
2. DPT dikunci (tidak dapat diubah lewat sistem) saat status pemilu `published`. Perubahan DPT setelah itu hanya dengan keputusan panitia dan Pembina, dicatat di berita acara, dan memerlukan kembali ke `draft` (hanya mungkin sebelum `open`).
3. Satu pemilih satu suara. Suara yang sudah masuk tidak dapat ditarik atau diubah.

## 2. Kandidat

1. Calon Ketua Umum, kandidat individu, diurutkan berdasarkan nomor urut yang ditetapkan panitia.
2. Profil (foto, visi, misi, program kerja) disediakan panitia; tampilan seluruh kandidat harus setara (ukuran, urutan blok, tanpa penonjolan).
3. Opsi **kotak kosong** aktif apabila kandidat hanya satu. Pada kandidat lebih dari satu, kotak kosong tidak disediakan kecuali panitia memutuskan lain sebelum `published`.

## 3. Waktu

1. Pemungutan suara: Kamis, 19 November 2026, 07.00-18.00 WIB.
2. Sistem menolak suara di luar jendela waktu berdasarkan jam server, apa pun status devicenya.
3. Perpanjangan: hanya atas keputusan Bapak Pembina, dilakukan admin IT dengan mengubah `closes_at` **sebelum** waktu tutup terlewati, dan dicatat di audit log serta berita acara. Tidak ada pembukaan kembali setelah status `closed`.
4. Antrean pada pukul 18.00: pemilih yang sudah berada di meja registrasi sebelum 18.00 tetap dilayani jika Pembina memutuskan perpanjangan sebelum 18.00.

## 4. Tata cara memilih

1. Pemilih datang ke meja registrasi; petugas memverifikasi identitas fisik (KTM) terhadap DPT cetak/daftar hadir.
2. Pemilih diarahkan ke device yang tersedia dan menekan "Mulai".
3. Pemilih login dengan akun Google `@student.itera.ac.id` miliknya sendiri. Sistem menolak jika email tidak ada di DPT atau pemilih sudah memilih.
4. Pemilih memilih satu kandidat (atau kotak kosong jika tersedia), meninjau layar konfirmasi, lalu mengirim.
5. Layar menampilkan "Suara tercatat", sesi dihancurkan, akun Google di device dikeluarkan, dan layar kembali ke awal.
6. Pemilih meninggalkan device. Petugas memastikan layar sudah kembali ke awal sebelum pemilih berikutnya.
7. Pemilih dilarang memotret layar pilihan. Device ditempatkan dengan sekat privasi. Satu pemilih per device pada satu waktu.
8. Pemilih tidak boleh memilih "ingat saya" atau menyimpan password Google di device.

## 5. Kerahasiaan

1. Sistem tidak menyimpan hubungan antara pemilih dan pilihan. Sistem mencatat _bahwa_ seseorang sudah memilih dan waktunya (dibulatkan 5 menit), bukan _apa_ pilihannya.
2. Admin IT tidak memiliki akses ke hasil per kandidat sebelum prosedur pembukaan (bagian 7).
3. Tidak ada pihak yang diperbolehkan meminta akses langsung ke database selama pemilu berlangsung.

## 6. Aturan menang

1. Pemenang adalah kandidat dengan suara terbanyak (asumsi, `[PERLU DIPUTUSKAN]` jika AD/ART mensyaratkan 50%+1).
2. Kandidat tunggal: menang jika suaranya lebih banyak daripada kotak kosong `[PERLU DIPUTUSKAN: tindak lanjut jika kotak kosong menang atau seri]`.
3. Seri: sistem hanya melaporkan seri; penyelesaiannya mengikuti AD/ART `[PERLU DIPUTUSKAN]`.
4. Tidak ada kuorum otomatis di sistem. Panitia menilai kuorum dari data turnout bila diperlukan.

## 7. Penutupan dan pembukaan hasil

1. Penutupan: setelah 18.00 (atau waktu perpanjangan), admin IT menekan "Tutup pemilu" dengan konfirmasi. Status menjadi `closed`.
2. Rekonsiliasi: sistem membandingkan jumlah suara masuk dengan jumlah pemilih yang berstatus sudah memilih. Jika tidak sama, hasil **tidak dibuka** dan masalah dilaporkan ke Pembina.
3. Pembukaan hasil: dua admin IT berbeda masing-masing menyetujui di sistem, disaksikan Bapak Pembina dan/atau saksi. Persetujuan dicatat di audit log.
4. Setelah dibuka, panitia mengekspor hasil dan berita acara (dengan hash SHA-256), mencetak, dan menandatanganinya.
5. Hasil diumumkan oleh panitia, bukan otomatis oleh sistem.

## 8. Keadaan darurat

| Situasi                                             | Tindakan                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Satu device bermasalah                              | Cabut device di admin, pemilih pindah ke device lain, catat di log insiden                                                           |
| Google OAuth atau jaringan mati                     | Tahan antrean, coba pulih; jika > 15 menit, minta keputusan Pembina: perpanjang waktu atau tunda                                     |
| Sistem tidak dapat dipulihkan                       | Pembina memutuskan penundaan; tidak ada pengalihan ke kertas tanpa keputusan tertulis panitia dan Pembina                            |
| Pemilih mengaku belum memilih tetapi tercatat sudah | Catat insiden; sistem tidak mengizinkan koreksi. Eskalasi ke Pembina                                                                 |
| Pemilih sah tidak ada di DPT                        | Tidak boleh memilih di sistem. Panitia memutuskan lewat Pembina; pembaruan DPT hanya pada status `draft` (tidak mungkin saat `open`) |
| Dugaan pelanggaran oleh admin                       | Audit log ditinjau Pembina; tidak ada penghapusan log                                                                                |

## 9. Sengketa

1. Keberatan diajukan tertulis ke panitia dalam `[PERLU DIPUTUSKAN: N]` jam setelah pengumuman.
2. Bahan pemeriksaan: audit log, berita acara, hasil rekonsiliasi, ekspor hasil. Pilihan individu tidak dapat diperiksa karena memang tidak tersimpan.

## 10. Data setelah pemilu

Semua device dicabut. Hasil agregat dan berita acara diarsipkan. Data pribadi DPT dihapus dari sistem `[PERLU DIPUTUSKAN: N hari setelah masa sengketa]`. File CSV DPT asli yang dipegang panitia dikelola panitia dan tidak disimpan di repo.
