<!-- Kepala surat suara: segel guilloche, judul, dan petunjuk singkat. -->
<script lang="ts">
	import Guilloche from './Guilloche.svelte';

	let { title, hint }: { title: string; hint: string } = $props();
</script>

<div class="head">
	<div class="emblem">
		<Guilloche strands={12} waves={13} inner={40} outer={98} strokeWidth={1} />
	</div>
	<div class="text">
		<p class="kind">Surat suara</p>
		<p class="title">{title}</p>
	</div>
	<p class="hint">{hint}</p>
</div>

<style>
	.head {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 4px 16px;
		padding: 20px 24px 18px;
		border-bottom: 2px solid var(--brown);
		background:
			repeating-linear-gradient(135deg, transparent 0 6px, rgb(197 154 39 / 0.09) 6px 7px),
			var(--paper-light);
	}

	.head::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -6px;
		border-bottom: 1px solid var(--brown);
	}

	.emblem {
		width: 52px;
		color: var(--gold-dark);
	}

	.kind {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--brown);
	}

	.title {
		font: 500 clamp(18px, 2.2vw, 22px) / 1.15 var(--font-display);
		text-wrap: balance;
	}

	.hint {
		grid-column: 1 / -1;
		margin-top: 8px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}
</style>
