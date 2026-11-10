#!/usr/bin/env node
/**
 * `pnpm dev` / `npm run dev`: pilih mode server pengembangan, lalu jalankan `vite dev`.
 *
 *   1. Live remote  database STAGING di Cloudflare (perlu `wrangler login`) + login Google asli.
 *   2. Dummy local  database lokal diisi ulang dengan data dummy (scripts/seed-demo.sql) +
 *                   login impersonate (pilih pengguna dari daftar, tanpa Google).
 *
 * Tanpa menu: `pnpm dev staging`, `pnpm dev demo`, atau `pnpm dev local` (database lokal apa
 * adanya + login Google, seperti sebelumnya). Argumen lain diteruskan ke vite, mis. `--host`.
 * Mode demo tidak pernah ikut ke build: lihat `__DEV_MODE__` di vite.config.ts.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const MODES = {
	staging: 'Live remote: database staging (Cloudflare) + login Google',
	demo: 'Dummy local: data dummy di komputer ini + login tanpa Google',
	local: 'Lokal: database lokal apa adanya + login Google'
};

const args = process.argv.slice(2);
let mode = args[0] in MODES ? args.shift() : null;

async function ask(question, fallback) {
	const rl = createInterface({ input: stdin, output: stdout });
	try {
		return (await rl.question(question)).trim() || fallback;
	} finally {
		rl.close();
	}
}

if (!mode) {
	if (!stdin.isTTY) {
		console.error('Pilih mode: pnpm dev staging | pnpm dev demo | pnpm dev local');
		process.exit(1);
	}
	console.log('\nPemira PMK ITERA · server pengembangan\n');
	console.log(`  1) ${MODES.staging}`);
	console.log(`  2) ${MODES.demo}\n`);
	const answer = await ask('Pilih [1/2] (bawaan 2): ', '2');
	mode = answer === '1' ? 'staging' : answer === '2' ? 'demo' : null;
	if (!mode) {
		console.error(`Pilihan tidak dikenal: ${answer}`);
		process.exit(1);
	}
}

function run(command, commandArgs) {
	const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: false });
	if (result.status !== 0) process.exit(result.status ?? 1);
}

const bin = (name) => new URL(`../node_modules/.bin/${name}`, import.meta.url).pathname;

if (mode === 'demo') {
	const reset =
		!stdin.isTTY || args.includes('--reset')
			? 'y'
			: await ask('Isi ulang data dummy ke kondisi awal? [Y/n] ', 'y');
	if (reset.toLowerCase() !== 'n') {
		console.log('\nMengosongkan database lokal dan mengisi data dummy…');
		run('rm', ['-rf', '.wrangler/state/v3/d1']);
		run(bin('wrangler'), ['d1', 'migrations', 'apply', 'pemira-db', '--local']);
		run(bin('wrangler'), [
			'd1',
			'execute',
			'pemira-db',
			'--local',
			'--file',
			'scripts/seed-demo.sql'
		]);
	}
	console.log('\nMode demo: buka /masuk, lalu pilih pengguna dari daftar.\n');
} else if (mode === 'staging') {
	console.log(
		'\nLive remote: data yang diubah di sini masuk ke database STAGING (bukan production).\n' +
			'Butuh `pnpm wrangler login` dengan akun Cloudflare yang memegang pemira-db-staging.\n'
	);
}

const viteArgs = ['dev', ...args.filter((a) => a !== '--reset')];
const child = spawn(bin('vite'), viteArgs, {
	stdio: 'inherit',
	env: { ...process.env, PEMIRA_DEV_MODE: mode }
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
