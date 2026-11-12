/**
 * Dokumentasi rangkaian kegiatan Pemira (beranda, #kegiatan).
 *
 * Foto ada di `static/dokumentasi/<id>/NN.webp` (sisi terpanjang maks. 1600 px) dan
 * `static/dokumentasi/<id>/kecil/NN.webp` (maks. 640 px). Metadata (termasuk lokasi GPS) sudah
 * dibuang saat konversi. Ukuran [lebar, tinggi] dicatat di sini supaya tata letak tidak melompat.
 */

export interface Photo {
	src: string;
	thumb: string;
	width: number;
	height: number;
}

export interface Activity {
	id: string;
	title: string;
	/** Label pendek untuk tombol pilihan kegiatan. */
	short: string;
	date: string;
	photos: Photo[];
}

function photos(id: string, sizes: [number, number][]): Photo[] {
	return sizes.map(([width, height], i) => {
		const n = String(i + 1).padStart(2, '0');
		return {
			src: `/dokumentasi/${id}/${n}.webp`,
			thumb: `/dokumentasi/${id}/kecil/${n}.webp`,
			width,
			height
		};
	});
}

export const ACTIVITIES: readonly Activity[] = [
	{
		id: 'sekolah-1',
		short: 'Sekolah Pemira 1',
		title: 'Sekolah Pemira, hari 1',
		date: 'Rabu, 28 Oktober 2026',
		photos: photos('sekolah-1', [
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[1200, 1600],
			[1600, 900],
			[1200, 1600],
			[1200, 1600],
			[1600, 1200],
			[1600, 1200],
			[1200, 1600],
			[1200, 1600],
			[1600, 1200],
			[1600, 900],
			[1200, 1600],
			[1200, 1600],
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[1600, 900],
			[900, 1600],
			[1600, 900],
			[1600, 900]
		])
	},
	{
		id: 'sekolah-2',
		short: 'Sekolah Pemira 2',
		title: 'Sekolah Pemira, hari 2',
		date: '4–5 November 2026',
		photos: photos('sekolah-2', [
			[1280, 959],
			[1280, 959],
			[959, 1280],
			[1280, 960],
			[1280, 960],
			[1280, 960],
			[1280, 959],
			[1280, 959],
			[1280, 959],
			[959, 1280]
		])
	},
	{
		id: 'sekolah-3',
		short: 'Sekolah Pemira 3',
		title: 'Sekolah Pemira, hari 3',
		date: 'Jumat, 6 November 2026',
		photos: photos('sekolah-3', [
			[1280, 720],
			[1280, 720],
			[1280, 720],
			[1280, 720],
			[1280, 720],
			[1280, 720],
			[1280, 720],
			[1280, 720]
		])
	},
	{
		id: 'verifikasi-2',
		short: 'Pencabutan nomor urut',
		title: 'Verifikasi berkas tahap 2 dan pencabutan nomor urut',
		date: 'Minggu, 8 November 2026',
		photos: photos('verifikasi-2', [
			[1280, 720],
			[720, 1280],
			[1280, 720],
			[720, 1280],
			[720, 1280],
			[720, 1280],
			[720, 1280],
			[720, 1280],
			[720, 1280],
			[720, 1280],
			[1280, 720],
			[900, 1600],
			[720, 1280],
			[720, 1280],
			[900, 1600],
			[1280, 720],
			[1280, 720],
			[1280, 720],
			[720, 1280],
			[720, 1280],
			[720, 1280],
			[720, 1280],
			[720, 1280],
			[1280, 720],
			[720, 1280],
			[1280, 720]
		])
	}
];
