# Pemira PMK ITERA: aturan tetap untuk agent

Sistem e-voting pemilihan Ketua Umum PMK ITERA. Pemilihan: Kamis, 19 November 2026, 07.00-18.00 WIB, di lokasi, memakai device milik panitia (tablet/laptop, 5-9 unit). Perkiraan pemilih ~700, kapasitas desain 5.000.

Sumber kebenaran ada di `docs/` (baca sebelum mengubah apa pun):
`01-prd.md`, `02-aturan-pemilu-sop.md`, `03-arsitektur-data-model.md`, `04-threat-model-test-plan.md`, `05-runbook-hari-h.md`.
Jika kode dan dokumen bertentangan, BERHENTI dan tanyakan. Jangan mengubah dokumen untuk membenarkan kode.

## Stack (final, jangan diubah tanpa persetujuan pemilik proyek)

- Astro (SSR) + TypeScript strict + Tailwind CSS. BUKAN Next.js.
- Cloudflare Workers (`@astrojs/cloudflare`), D1 + Drizzle ORM, R2 (foto kandidat), KV (rate limit, best-effort), Turnstile.
- Auth: Google OAuth via Arctic. Hanya `@student.itera.ac.id`, diverifikasi di server, lalu dicocokkan dengan tabel DPT (`voters`).
- Tooling: pnpm, wrangler, vitest.

## Invarian keamanan (tidak boleh dilanggar)

1. `ballots` TIDAK menyimpan atau bisa dihubungkan ke pemilih, device, atau waktu. Tanpa `voter_id`, `device_id`, timestamp. `WITHOUT ROWID`, id acak 128-bit.
2. Tidak boleh ada query, endpoint, log, atau export yang meng-JOIN `ballots` dengan `voters`/`devices`/sesi.
3. `voted_at` hanya di `voters`, dibulatkan ke bawah per 5 menit.
4. Voting atomik: penandaan `has_voted` dan penyisipan ballot dalam satu `db.batch()`. Vote ganda harus mustahil, termasuk request paralel.
5. D1 tidak punya RLS: setiap endpoint memeriksa otorisasi secara eksplisit (device, sesi voter, atau sesi admin). Default tolak.
6. Hasil per kandidat tidak bisa dibaca siapa pun (termasuk admin) sebelum status `closed` DAN persetujuan 2 admin berbeda.
7. Payload vote dan pilihan kandidat tidak boleh masuk log, audit log, atau respons.
8. Secret, token, ID Cloudflare asli, dan data DPT asli TIDAK boleh masuk repo (`data/` dan `.dev.vars` di `.gitignore`).
9. Waktu voting ditegakkan di server (jam server), bukan di klien.

## Cara kerja

- Kerjakan satu fase pada satu waktu sesuai master prompt, lalu berhenti dan lapor.
- Baca struktur repo dulu. Bertanya jika ambigu; jangan menebak.
- Jangan menambah dependency tanpa alasan tertulis. Jangan commit/push/deploy kecuali diminta.
- Setiap perubahan area sensitif (auth, voting, hasil, audit) wajib disertai tes sesuai `docs/04-threat-model-test-plan.md`.

## Perintah

`pnpm install` · `pnpm dev` · `pnpm check` · `pnpm typecheck` · `pnpm test` · `pnpm build`
