import { isValidNim } from './access';
import { sha256Hex } from './hash';

export interface DptVoter {
	nim: string;
	name: string;
}

export interface DptParseResult {
	voters: DptVoter[];
	errors: string[];
}

/** Pisahkan satu baris CSV; mendukung tanda kutip ganda. */
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

/** Pemisah ditentukan sekali dari baris pertama: `;` (Excel berbahasa Indonesia) atau `,`. */
function detectDelimiter(firstLine: string): string {
	const outsideQuotes = firstLine.replace(/"[^"]*"/g, '');
	const semicolons = outsideQuotes.split(';').length - 1;
	const commas = outsideQuotes.split(',').length - 1;
	return semicolons > commas ? ';' : ',';
}

const NIM_HEADERS = ['nim'];
const NAME_HEADERS = ['nama', 'name', 'nama mahasiswa'];

/**
 * Baca DPT dari teks CSV. Kolom yang dipakai hanya `nim` dan `nama`; kolom lain
 * (email, prodi, angkatan, dst.) diabaikan dan tidak disimpan, sehingga ekspor data
 * kampus bisa langsung diunggah. Tanpa baris judul, kolom NIM dikenali sebagai sel
 * yang seluruhnya angka. Jika ada satu saja baris yang salah, seluruh impor ditolak
 * supaya DPT yang masuk selalu utuh.
 */
export function parseDpt(text: string): DptParseResult {
	const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
	const voters: DptVoter[] = [];
	const errors: string[] = [];
	const seen = new Set<string>();

	let delimiter: string | null = null;
	let nimIndex: number | null = null;
	let nameIndex: number | null = null;

	lines.forEach((rawLine, i) => {
		const line = rawLine.trim();
		if (!line) return;

		if (delimiter === null) {
			delimiter = detectDelimiter(line);
			const lower = splitCsvLine(line, delimiter).map((c) => c.toLowerCase());
			const headerNim = lower.findIndex((c) => NIM_HEADERS.includes(c));
			if (headerNim !== -1) {
				nimIndex = headerNim;
				const headerName = lower.findIndex((c) => NAME_HEADERS.includes(c));
				nameIndex = headerName !== -1 ? headerName : null;
				return;
			}
		}

		const cells = splitCsvLine(line, delimiter);
		const ni = nimIndex ?? cells.findIndex((c) => /^\d+$/.test(c));
		const nim = ni >= 0 ? (cells[ni] ?? '') : '';
		const nmi = nameIndex ?? (nimIndex === null ? cells.findIndex((_, idx) => idx !== ni) : -1);
		const name = nmi >= 0 ? (cells[nmi] ?? '') : '';

		if (!isValidNim(nim)) {
			errors.push(`Baris ${i + 1}: NIM tidak valid "${nim || line}"`);
			return;
		}
		if (seen.has(nim)) {
			errors.push(`Baris ${i + 1}: NIM ganda ${nim}`);
			return;
		}
		seen.add(nim);
		voters.push({ nim, name });
	});

	if (voters.length === 0 && errors.length === 0) errors.push('Berkas tidak berisi data pemilih.');
	return { voters, errors };
}

/**
 * Sidik jari DPT: SHA-256 dari daftar NIM (urut, satu per baris).
 * Bisa diumumkan tanpa membuka isi DPT; perubahan sekecil apa pun mengubah hash.
 */
export function dptFingerprint(nims: string[]): Promise<string> {
	return sha256Hex([...nims].sort().join('\n'));
}

/**
 * Jumlah baris per statement. Seluruh potongan dikirim sebagai SATU parameter JSON
 * (`json_each`), sehingga 4.500 pemilih cukup 5 statement: aman terhadap batas D1
 * 100 parameter per statement dan batas jumlah query per request.
 */
export const DPT_ROWS_PER_STATEMENT = 1000;

export function dptInsertStatements(db: D1Database, voters: DptVoter[]): D1PreparedStatement[] {
	const statements: D1PreparedStatement[] = [];
	for (let i = 0; i < voters.length; i += DPT_ROWS_PER_STATEMENT) {
		const chunk = voters.slice(i, i + DPT_ROWS_PER_STATEMENT).map((v) => [v.nim, v.name]);
		statements.push(
			db
				.prepare(
					`INSERT INTO voters (nim, name)
					 SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?)`
				)
				.bind(JSON.stringify(chunk))
		);
	}
	return statements;
}
