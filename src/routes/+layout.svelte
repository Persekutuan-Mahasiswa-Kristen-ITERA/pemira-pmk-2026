<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import Seal from '#lib/components/Seal.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const REPO_URL = 'https://github.com/Persekutuan-Mahasiswa-Kristen-ITERA/pemira-pmk-2026';
	const COMMIT = __APP_COMMIT__;
	const COMMIT_IS_PUBLISHED = /^[0-9a-f]{40}$/.test(COMMIT);

	let path = $derived(page.url.pathname);

	const PRODUCTION_URL = 'https://pemira.pmkitera.web.id';
	const ENV_LABEL = {
		production: 'Resmi (production)',
		staging: 'Uji coba (staging)',
		local: 'Lokal (komputer developer)'
	} as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="skip" href="#konten">Lewati ke konten</a>

<header class="topbar">
	{#if data.appEnv !== 'production'}
		<div class="env-ribbon" role="note">
			<div class="container env-inner">
				{#if data.appEnv === 'staging'}
					<p>
						<strong>Situs uji coba.</strong> Database terpisah; suara di sini tidak dihitung dalam pemilihan
						resmi.
					</p>
					<a href={PRODUCTION_URL} rel="external">Ke situs resmi →</a>
				{:else if data.demo}
					<p>
						<strong>Mode demo.</strong> Data dummy di komputer ini{#if data.userEmail}; masuk
							sebagai
							<strong>{data.userEmail}</strong>{:else}; masuk tanpa Google{/if}.
					</p>
					{#if data.userEmail}
						<form method="POST" action={resolve('/keluar')}>
							<button type="submit">Ganti pengguna →</button>
						</form>
					{/if}
				{:else}
					<p><strong>Pengembangan lokal.</strong> Memakai database lokal di komputer ini.</p>
				{/if}
			</div>
		</div>
	{/if}
	<div
		class="container topbar-inner"
		class:crowded={(data.isAdmin || data.isOfficer) && data.userEmail}
	>
		<a class="brand" href={resolve('/')} aria-label="Pemira PMK ITERA, beranda">
			<Seal size={42} />
			<span class="brand-text">
				<span class="brand-name">Pemira <em>PMK ITERA</em></span>
				<span class="brand-small">Pemilihan Ketua 2027</span>
			</span>
		</a>

		<nav class="nav" aria-label="Navigasi utama">
			<a href={resolve('/hasil')} aria-current={path === '/hasil' ? 'page' : undefined}>Hasil</a>
			{#if data.isOfficer}
				<a href={resolve('/petugas')} aria-current={path === '/petugas' ? 'page' : undefined}
					>Petugas</a
				>
			{/if}
			{#if data.isAdmin}
				<a href={resolve('/admin')} aria-current={path.startsWith('/admin') ? 'page' : undefined}
					>Admin</a
				>
			{/if}
			{#if data.userEmail}
				<form class="session" method="POST" action={resolve('/keluar')}>
					<span class="session-email" title={data.userEmail}>{data.userEmail}</span>
					<button type="submit">Keluar</button>
				</form>
			{:else if path !== '/masuk'}
				<a class="nav-cta" href={resolve('/masuk')}>Masuk</a>
			{/if}
		</nav>
	</div>
</header>

<main id="konten">
	{@render children()}
</main>

<footer class="footer">
	<div class="container footer-inner">
		<p class="motto">Suara yang bijak, <em>pelayanan yang berdampak.</em></p>
		<div class="footer-meta">
			<p>Persekutuan Mahasiswa Kristen · Institut Teknologi Sumatera</p>
			<p class="env-line" data-env={data.appEnv}>
				<span class="env-dot" aria-hidden="true"></span>
				Database: <strong>{ENV_LABEL[data.appEnv]}</strong>
			</p>
			<p>
				Kode sumber terbuka untuk diaudit di
				<a href={REPO_URL} rel="noopener">GitHub</a>
				· versi
				{#if COMMIT_IS_PUBLISHED}
					<a class="commit" href="{REPO_URL}/commit/{COMMIT}" rel="noopener">{COMMIT.slice(0, 7)}</a
					>
				{:else}
					<span class="commit" title={COMMIT}>{COMMIT.slice(0, 7)} (build lokal)</span>
				{/if}
			</p>
		</div>
	</div>
</footer>

<style>
	.skip {
		position: absolute;
		left: -9999px;
	}

	.skip:focus {
		left: 16px;
		top: 16px;
		z-index: 30;
		padding: 8px 12px;
		border-radius: 8px;
		background: var(--ink);
		color: var(--paper);
	}

	main {
		flex: 1;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		background: rgb(240 233 220 / 0.82);
		backdrop-filter: blur(12px) saturate(1.2);
		-webkit-backdrop-filter: blur(12px) saturate(1.2);
		border-bottom: 1px solid rgb(215 201 179 / 0.7);
	}

	.topbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 72px;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		text-decoration: none;
	}

	.brand-text {
		display: grid;
		line-height: 1.1;
	}

	.brand-name {
		font: 500 20px var(--font-display);
		letter-spacing: -0.01em;
		white-space: nowrap;
	}

	.brand-name em {
		color: var(--brown);
	}

	.brand-small {
		margin-top: 3px;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		font-size: 14px;
		font-weight: 700;
	}

	.nav > a {
		padding: 8px 12px;
		border-radius: 999px;
		color: var(--ink-soft);
		text-decoration: none;
	}

	.nav > a:hover {
		background: rgb(98 67 31 / 0.08);
		color: var(--ink);
	}

	.nav > a[aria-current='page'] {
		background: var(--sand);
		color: var(--brown-dark);
	}

	.nav > a.nav-cta {
		margin-left: 4px;
		padding-inline: 18px;
		background: var(--brown);
		color: var(--paper-light);
	}

	.nav > a.nav-cta:hover {
		background: var(--brown-dark);
	}

	.session {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		margin-left: 6px;
		padding: 4px 4px 4px 14px;
		border-radius: 999px;
		background: var(--paper-light);
		box-shadow: inset 0 0 0 1px var(--line);
	}

	.session-email {
		max-width: 22ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		font-weight: 600;
		color: var(--ink-muted);
	}

	.session button {
		flex: none;
		padding: 6px 12px;
		border: 0;
		border-radius: 999px;
		background: var(--sand);
		font: 800 13px var(--font-body);
		color: var(--brown-dark);
		cursor: pointer;
	}

	.session button:hover {
		background: var(--gold-light);
	}

	@media (max-width: 640px) {
		.brand-small,
		.session-email {
			display: none;
		}

		.brand-name {
			font-size: 18px;
		}

		.session {
			padding-left: 4px;
		}

		.nav > a {
			padding-inline: 10px;
		}
	}

	@media (max-width: 380px) {
		.brand-text {
			display: none;
		}
	}

	@media (max-width: 520px) {
		.crowded .brand-text {
			display: none;
		}
	}

	.footer {
		margin-top: 48px;
		background: var(--brown-dark);
		color: var(--sand);
	}

	.footer-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px 40px;
		padding-block: 40px;
	}

	.motto {
		max-width: 18ch;
		font: 400 clamp(26px, 3.4vw, 34px) / 1.1 var(--font-display);
		letter-spacing: -0.01em;
		color: var(--paper-light);
	}

	.motto em {
		color: var(--gold);
	}

	/* Penanda lingkungan uji coba: pita bergaris di atas header */
	.env-ribbon {
		background: repeating-linear-gradient(-45deg, var(--gold) 0 14px, var(--gold-light) 14px 28px);
		color: var(--ink);
		font-size: 13px;
	}

	.env-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 2px 16px;
		padding-block: 7px;
	}

	.env-inner p {
		padding: 1px 8px;
		border-radius: 4px;
		background: rgb(247 243 234 / 0.85);
	}

	.env-inner a,
	.env-inner button {
		padding: 1px 8px;
		border-radius: 4px;
		background: var(--ink);
		font-weight: 800;
		color: var(--paper-light);
		text-decoration: none;
	}

	.env-inner button {
		border: 0;
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}

	.env-line {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.env-line strong {
		color: var(--paper-light);
	}

	.env-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--gold);
	}

	.env-line[data-env='production'] .env-dot {
		background: #8fb55a;
		box-shadow: 0 0 0 3px rgb(143 181 90 / 0.25);
	}

	.footer-meta {
		display: grid;
		gap: 4px;
		font-size: 13px;
	}

	.footer a {
		color: var(--gold-light);
		font-weight: 700;
	}

	.commit {
		font-family: var(--font-mono);
	}
</style>
