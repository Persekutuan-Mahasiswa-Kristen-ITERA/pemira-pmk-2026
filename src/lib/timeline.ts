/**
 * Linimasa Pemira yang ditampilkan di beranda (#timeline).
 *
 * Sumber: balasan persiapan panitia (13 November 2026). Ini hanya informasi; jam buka/tutup yang
 * BERLAKU untuk pemungutan suara tetap `election_config` di database (Admin → Ringkasan & jadwal).
 * Mengubah daftar ini butuh deploy, jadi perbarui sebelum kode dibekukan (18 November 2026).
 */

export interface TimelineEvent {
	id: string;
	title: string;
	/** Rentang tanggal WIB, `YYYY-MM-DD`. Dipakai untuk menandai Selesai / Hari ini. */
	start: string;
	end: string;
	/** Tanggal seperti yang ditampilkan. */
	date: string;
	time?: string;
	place?: string;
	note?: string;
}

export const VOTING_DAY = 'Kamis, 19 November 2026';
export const VOTING_HOURS = '09.00–18.00 WIB';

export const TIMELINE: readonly TimelineEvent[] = [
	{
		id: 'verifikasi-1',
		title: 'Verifikasi berkas tahap 1',
		start: '2026-10-25',
		end: '2026-10-25',
		date: 'Minggu, 25 Oktober 2026'
	},
	{
		id: 'sekolah-pemira',
		title: 'Sekolah Pemira',
		start: '2026-10-28',
		end: '2026-11-06',
		date: '28 Oktober dan 4–6 November 2026',
		note: 'Pembekalan bakal calon dalam tiga pertemuan.'
	},
	{
		id: 'nomor-urut',
		title: 'Verifikasi berkas tahap 2 dan pencabutan nomor urut',
		start: '2026-11-08',
		end: '2026-11-08',
		date: 'Minggu, 8 November 2026'
	},
	{
		id: 'uji-panelis',
		title: 'Uji panelis',
		start: '2026-11-13',
		end: '2026-11-13',
		date: 'Jumat, 13 November 2026',
		time: '16.30–18.30 WIB',
		place: 'Labtek 2 lantai 2, Ruang Seminar Arsitektur'
	},
	{
		id: 'hearing',
		title: 'Hearing calon',
		start: '2026-11-16',
		end: '2026-11-16',
		date: 'Senin, 16 November 2026',
		note: 'Jam dan tempat diumumkan panitia paling lambat 14 November 2026.'
	},
	{
		id: 'pemungutan-suara',
		title: 'Pemungutan suara',
		start: '2026-11-19',
		end: '2026-11-19',
		date: VOTING_DAY,
		time: VOTING_HOURS,
		place: 'TPS (lokasi diumumkan panitia)',
		note: 'Datang ke TPS dengan KTM dan HP.'
	},
	{
		id: 'pengumuman',
		title: 'Pengumuman hasil',
		start: '2026-11-20',
		end: '2026-11-20',
		date: 'Jumat, 20 November 2026',
		place: 'Instagram PMK ITERA'
	}
];

export type TimelineStatus = 'done' | 'today' | 'upcoming';

/** Tanggal WIB (`YYYY-MM-DD`) dari detik Unix. */
export function wibDate(seconds: number): string {
	return new Date((seconds + 7 * 3600) * 1000).toISOString().slice(0, 10);
}

export function timelineStatus(event: TimelineEvent, nowSeconds: number): TimelineStatus {
	const today = wibDate(nowSeconds);
	if (today > event.end) return 'done';
	if (today >= event.start) return 'today';
	return 'upcoming';
}
