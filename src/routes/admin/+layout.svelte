<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: resolve('/admin'), label: 'Ringkasan & jadwal' },
		{ href: resolve('/admin/calon'), label: 'Calon' },
		{ href: resolve('/admin/dpt'), label: 'DPT' },
		{ href: resolve('/admin/audit'), label: 'Audit log' }
	];
</script>

<div class="container admin">
	<p class="eyebrow">Panel panitia</p>
	<nav aria-label="Navigasi admin">
		{#each links as link (link.href)}
			<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>
				{link.label}
			</a>
		{/each}
	</nav>
	{@render children()}
</div>

<style>
	.admin {
		padding-block: 32px 96px;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 14px 0 36px;
		border-bottom: 1px solid var(--line);
	}

	nav a {
		padding: 10px 14px;
		font-size: 14px;
		font-weight: 700;
		color: var(--ink-muted);
		text-decoration: none;
		border-bottom: 3px solid transparent;
		margin-bottom: -1px;
	}

	nav a:hover {
		color: var(--ink);
	}

	nav a[aria-current='page'] {
		color: var(--brown);
		border-bottom-color: var(--brown);
	}

	/* Gaya bersama untuk halaman admin */
	.admin :global(h1) {
		font-size: clamp(30px, 4vw, 42px);
	}

	.admin :global(h2) {
		font-size: 24px;
		margin-top: 40px;
	}

	.admin :global(.panel) {
		margin-top: 16px;
		padding: 20px;
		background: var(--paper-light);
		border: 1px solid var(--line);
	}

	.admin :global(.field) {
		display: grid;
		gap: 6px;
		margin-bottom: 16px;
		font-size: 14px;
		font-weight: 700;
	}

	.admin :global(.field input),
	.admin :global(.field textarea) {
		font: 400 15px var(--font-body);
		padding: 10px 12px;
		border: 1px solid var(--line);
		background: #fff;
		color: var(--ink);
	}

	.admin :global(.field input:disabled) {
		background: var(--paper);
		color: var(--ink-muted);
	}

	.admin :global(.hint) {
		font-size: 13px;
		font-weight: 400;
		color: var(--ink-muted);
	}

	.admin :global(.msg-error),
	.admin :global(.msg-ok) {
		margin: 16px 0;
		padding: 12px 14px;
		font-size: 14px;
		border-left: 3px solid;
	}

	.admin :global(.msg-error) {
		background: #f7e6dc;
		border-color: #a3402a;
		color: #6b2414;
	}

	.admin :global(.msg-ok) {
		background: #eaf0dc;
		border-color: #5b7a2a;
		color: #34470f;
	}

	.admin :global(.button-danger) {
		background: #8f2f1c;
	}

	.admin :global(.button-danger:hover) {
		background: #6b2414;
	}

	.admin :global(.button:disabled) {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.admin :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}

	.admin :global(th),
	.admin :global(td) {
		text-align: left;
		padding: 10px 8px;
		border-bottom: 1px solid var(--line);
		vertical-align: top;
	}

	.admin :global(th) {
		font-size: 12px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.admin :global(.mono) {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 13px;
		word-break: break-all;
	}
</style>
