/** Waktu di aplikasi ini selalu WIB (UTC+7, tanpa daylight saving). */
const WIB_OFFSET_SECONDS = 7 * 3600;

const formatter = new Intl.DateTimeFormat('id-ID', {
	dateStyle: 'full',
	timeStyle: 'short',
	timeZone: 'Asia/Jakarta'
});

/** "Senin, 16 November 2026 pukul 21.31 WIB" */
export function formatWib(seconds: number | null): string {
	return seconds === null ? '' : `${formatter.format(new Date(seconds * 1000))} WIB`;
}

/** Nilai `<input type="datetime-local">` (dibaca sebagai WIB) → detik Unix. */
export function wibInputToUnix(value: string): number | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
	if (!m) return null;
	const [y, mo, d, h, mi] = m.slice(1).map(Number);
	const ms = Date.UTC(y, mo - 1, d, h, mi);
	const check = new Date(ms);
	// Tolak tanggal yang tidak ada, mis. 31 Februari.
	if (
		check.getUTCFullYear() !== y ||
		check.getUTCMonth() !== mo - 1 ||
		check.getUTCDate() !== d ||
		h > 23 ||
		mi > 59
	) {
		return null;
	}
	return ms / 1000 - WIB_OFFSET_SECONDS;
}

/** Detik Unix → nilai `<input type="datetime-local">` dalam WIB. */
export function unixToWibInput(seconds: number | null): string {
	if (seconds === null) return '';
	return new Date((seconds + WIB_OFFSET_SECONDS) * 1000).toISOString().slice(0, 16);
}
