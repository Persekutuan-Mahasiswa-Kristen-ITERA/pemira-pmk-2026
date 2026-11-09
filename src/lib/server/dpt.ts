import { isStudentEmail, normalizeEmail } from './access';
import { sha256Hex } from './hash';

export interface DptVoter {
	email: string;
	name: string;
}

export interface DptParseResult {
	voters: DptVoter[];
	errors: string[];
}

/** Pisahkan satu baris CSV; mendukung tanda kutip ganda dan pemisah `,` atau `;` (Excel). */
function splitCsvLine(line: string, delimiter: string): string[] {
	const cells: string[] = [];
	let current = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quoted) {
			if (ch === '"' && line[i + 1] === '"') {
				current += '"';
				i++;
			} else if (ch === '"') {
				quoted = false;
			} else {
				current += ch;
			}
		} else if (ch === '"') {
			quoted = true;
		} else if (ch === delimiter) {
			cells.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	cells.push(current);
	return cells.map((c) => c.trim());
}

/**
 * Baca DPT dari teks CSV dengan dua kolom: email dan nama (urutan bebas, baris
 * judul opsional). Jika ada satu saja baris yang salah, seluruh impor ditolak
 * supaya DPT yang masuk selalu utuh.
 */
export function parseDpt(text: string): DptParseResult {
	const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
	const voters: DptVoter[] = [];
	const errors: string[] = [];
	const seen = new Set<string>();

	let emailIndex: number | null = null;
	let nameIndex: number | null = null;
	let first = true;

	lines.forEach((rawLine, i) => {
		const line = rawLine.trim();
		if (!line) return;
		const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';
		const cells = splitCsvLine(line, delimiter);

		if (first) {
			first = false;
			const lower = cells.map((c) => c.toLowerCase());
			const headerEmail = lower.findIndex((c) => c === 'email' || c === 'e-mail');
			if (headerEmail !== -1) {
				emailIndex = headerEmail;
				const headerName = lower.findIndex((c) => c === 'nama' || c === 'name');
				nameIndex = headerName !== -1 ? headerName : null;
				return;
			}
		}

		const ei = emailIndex ?? cells.findIndex((c) => c.includes('@'));
		const rawEmail = ei >= 0 ? (cells[ei] ?? '') : '';
		const email = normalizeEmail(rawEmail);
		const ni = nameIndex ?? cells.findIndex((_, idx) => idx !== ei);
		const name = ni >= 0 ? (cells[ni] ?? '') : '';

		if (!isStudentEmail(email)) {
			errors.push(`Baris ${i + 1}: email tidak valid "${rawEmail || line}"`);
			return;
		}
		if (seen.has(email)) {
			errors.push(`Baris ${i + 1}: email ganda ${email}`);
			return;
		}
		seen.add(email);
		voters.push({ email, name });
	});

	if (voters.length === 0 && errors.length === 0) errors.push('Berkas tidak berisi data pemilih.');
	return { voters, errors };
}

/**
 * Sidik jari DPT: SHA-256 dari daftar email (urut abjad, satu per baris).
 * Bisa diumumkan tanpa membuka isi DPT; perubahan sekecil apa pun mengubah hash.
 */
export function dptFingerprint(emails: string[]): Promise<string> {
	return sha256Hex([...emails].sort().join('\n'));
}
