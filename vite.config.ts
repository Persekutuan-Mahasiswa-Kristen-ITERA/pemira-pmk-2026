import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { execSync } from 'node:child_process';

/**
 * Commit yang sedang di-build, ditampilkan di footer supaya auditor bisa
 * mencocokkan situs yang berjalan dengan kode di GitHub. Di GitHub Actions
 * memakai GITHUB_SHA; di lokal ditandai "-dirty" bila ada perubahan belum di-commit.
 */
function buildCommit(): string {
	if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
	try {
		const sha = execSync('git rev-parse HEAD').toString().trim();
		const dirty = execSync('git status --porcelain').toString().trim() !== '';
		return dirty ? `${sha}-dirty` : sha;
	} catch {
		return 'unknown';
	}
}

export default defineConfig({
	define: {
		__APP_COMMIT__: JSON.stringify(buildCommit())
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
