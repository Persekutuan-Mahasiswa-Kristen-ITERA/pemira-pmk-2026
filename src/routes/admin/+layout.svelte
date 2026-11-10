<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: resolve('/admin'), label: 'Ringkasan & jadwal', hint: 'Status dan waktu pemilihan' },
		{ href: resolve('/admin/calon'), label: 'Calon', hint: 'Nomor urut, visi, misi' },
		{ href: resolve('/admin/dpt'), label: 'DPT', hint: 'Daftar pemilih tetap' },
		{ href: resolve('/admin/audit'), label: 'Audit log', hint: 'Riwayat tindakan admin' }
	];
</script>

<div class="container admin">
	<aside class="side">
		<p class="eyebrow">Panel panitia</p>
		<nav aria-label="Navigasi admin">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>
					<span class="link-label">{link.label}</span>
					<span class="link-hint">{link.hint}</span>
				</a>
			{/each}
		</nav>
	</aside>
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.admin {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		align-items: start;
		gap: 48px;
		padding-block: 40px 32px;
	}

	.side {
		position: sticky;
		top: 96px;
	}

	nav {
		display: grid;
		gap: 4px;
		margin-top: 16px;
	}

	nav a {
		display: grid;
		gap: 1px;
		padding: 10px 14px;
		border-radius: 12px;
		text-decoration: none;
		transition: background-color 0.15s;
	}

	nav a:hover {
		background: rgb(98 67 31 / 0.07);
	}

	nav a[aria-current='page'] {
		background: var(--brown-dark);
		color: var(--paper-light);
	}

	.link-label {
		font-size: 15px;
		font-weight: 800;
	}

	.link-hint {
		font-size: 12px;
		color: var(--ink-muted);
	}

	nav a[aria-current='page'] .link-hint {
		color: var(--gold-light);
	}

	@media (max-width: 860px) {
		.admin {
			grid-template-columns: 1fr;
			gap: 28px;
		}

		.side {
			position: static;
		}

		nav {
			display: flex;
			gap: 6px;
			overflow-x: auto;
			padding-bottom: 4px;
		}

		nav a {
			flex: none;
			padding: 8px 14px;
			border-radius: 999px;
			box-shadow: inset 0 0 0 1px var(--line);
		}

		nav a[aria-current='page'] {
			box-shadow: none;
		}

		.link-hint {
			display: none;
		}
	}

	/* Gaya bersama untuk halaman admin */
	.content :global(h1) {
		font-size: clamp(34px, 4.4vw, 48px);
		font-weight: 450;
	}

	.content :global(h2) {
		margin-top: 44px;
		font-size: 26px;
		font-weight: 500;
	}

	.content :global(.panel) {
		margin-top: 16px;
		padding: clamp(18px, 3vw, 28px);
		border-radius: var(--radius);
		background: var(--paper-light);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 1px rgb(215 201 179 / 0.8);
	}

	.content :global(.field) {
		display: grid;
		gap: 6px;
		margin-bottom: 18px;
		font-size: 13px;
		font-weight: 800;
		color: var(--ink-soft);
	}

	.content :global(.field input),
	.content :global(.field textarea) {
		width: 100%;
		padding: 11px 14px;
		border: 1.5px solid var(--line);
		border-radius: var(--radius-sm);
		background: #fff;
		font: 400 15px var(--font-body);
		color: var(--ink);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.content :global(.field textarea) {
		resize: vertical;
	}

	.content :global(.field input:focus),
	.content :global(.field textarea:focus) {
		outline: none;
		border-color: var(--gold);
		box-shadow: 0 0 0 4px rgb(197 154 39 / 0.25);
	}

	.content :global(.field input:disabled),
	.content :global(.field textarea:disabled) {
		background: var(--paper);
		color: var(--ink-muted);
	}

	.content :global(.field input[type='file']) {
		padding: 8px;
		border-style: dashed;
	}

	.content :global(.hint) {
		font-size: 14px;
		font-weight: 400;
		color: var(--ink-muted);
	}

	.content :global(.msg-error),
	.content :global(.msg-ok) {
		margin: 16px 0;
	}

	.content :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}

	.content :global(th),
	.content :global(td) {
		text-align: left;
		padding: 12px 14px;
		border-bottom: 1px solid var(--line);
		vertical-align: top;
	}

	.content :global(tbody tr:last-child td) {
		border-bottom: 0;
	}

	.content :global(tbody tr:hover) {
		background: rgb(223 207 173 / 0.25);
	}

	.content :global(th) {
		background: var(--sand);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--brown-dark);
	}

	.content :global(.mono) {
		font-size: 13px;
		word-break: break-all;
	}
</style>
