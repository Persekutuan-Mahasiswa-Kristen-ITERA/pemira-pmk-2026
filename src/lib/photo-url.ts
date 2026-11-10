/** URL foto calon. `v` (waktu unggah) membuat URL berubah setiap kali foto diganti. */
export function photoUrl(candidateId: number, version: number | null): string | null {
	return version === null ? null : `/foto-calon/${candidateId}?v=${version}`;
}
