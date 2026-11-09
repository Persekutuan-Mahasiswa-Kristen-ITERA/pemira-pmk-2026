<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const REPO_URL = 'https://github.com/Persekutuan-Mahasiswa-Kristen-ITERA/pemira-pmk-2026';
	const COMMIT = __APP_COMMIT__;
	const COMMIT_IS_PUBLISHED = /^[0-9a-f]{40}$/.test(COMMIT);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="skip" href="#konten">Lewati ke konten</a>

<header class="container topbar">
	<a class="brand" href={resolve('/')} aria-label="Pemira PMK ITERA, beranda">
		<span class="brand-mark" aria-hidden="true">P</span>
		<span>
			PMK ITERA
			<span class="brand-small">Pemilihan Raya 2027</span>
		</span>
	</a>
	{#if data.userEmail}
		<form class="session" method="POST" action={resolve('/keluar')}>
			{#if data.isAdmin}<a class="admin-link" href={resolve('/admin')}>Admin</a>{/if}
			<span class="session-email">{data.userEmail}</span>
			<button type="submit">Keluar</button>
		</form>
	{/if}
</header>

<main id="konten">
	{@render children()}
</main>

<footer class="container footer">
	<p>Suara yang bijak, pelayanan yang berdampak.</p>
	<p>
		Kode sumber terbuka untuk diaudit:
		<a href={REPO_URL} rel="noopener">GitHub</a>
		· Versi
		{#if COMMIT_IS_PUBLISHED}
			<a class="commit" href="{REPO_URL}/commit/{COMMIT}" rel="noopener">{COMMIT.slice(0, 7)}</a>
		{:else}
			<span class="commit" title={COMMIT}>{COMMIT.slice(0, 7)} (build lokal)</span>
		{/if}
	</p>
</footer>

<style>
	.skip {
		position: absolute;
		left: -9999px;
	}

	.skip:focus {
		left: 16px;
		top: 16px;
		z-index: 10;
		padding: 8px 12px;
		background: var(--ink);
		color: var(--paper);
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 80px;
	}

	.session {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		font-size: 13px;
		color: var(--ink-muted);
	}

	.admin-link {
		font-weight: 700;
		color: var(--brown);
	}

	.session-email {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.session button {
		flex: none;
		padding: 8px 12px;
		border: 1px solid var(--line);
		background: transparent;
		font: 700 13px var(--font-body);
		color: var(--brown);
		cursor: pointer;
	}

	.session button:hover {
		background: var(--paper-light);
	}

	@media (max-width: 560px) {
		.admin-link {
			font-weight: 700;
			color: var(--brown);
		}

		.session-email {
			display: none;
		}
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		font: 600 17px var(--font-display);
		text-decoration: none;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: var(--brown);
		color: var(--paper);
		font: 600 19px var(--font-display);
	}

	.brand-small {
		display: block;
		margin-top: 2px;
		font: 700 10px var(--font-body);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 24px;
		padding-block: 28px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		color: var(--ink-muted);
	}

	.commit {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
	}

	.footer a {
		color: var(--brown);
		font-weight: 700;
	}
</style>
