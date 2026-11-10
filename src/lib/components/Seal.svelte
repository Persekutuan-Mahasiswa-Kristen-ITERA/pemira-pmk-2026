<!-- Cap/segel Pemira: roset guilloche dengan monogram di tengah. -->
<script lang="ts">
	import Guilloche from './Guilloche.svelte';

	let { size = 44 }: { size?: number } = $props();
</script>

<span class="seal" style:--size="{size}px" aria-hidden="true">
	<Guilloche strands={10} waves={11} inner={70} outer={98} strokeWidth={1.4} class="seal-ring" />
	<span class="seal-core">P</span>
</span>

<style>
	.seal {
		position: relative;
		display: inline-grid;
		place-items: center;
		flex: none;
		width: var(--size);
		height: var(--size);
		color: var(--gold);
	}

	.seal :global(.seal-ring) {
		position: absolute;
		inset: 0;
	}

	.seal-core {
		position: relative;
		display: grid;
		place-items: center;
		width: 64%;
		height: 64%;
		border-radius: 50%;
		background: var(--brown);
		color: var(--paper-light);
		font: italic 600 calc(var(--size) * 0.38) / 1 var(--font-display);
		box-shadow: inset 0 0 0 1.5px var(--gold);
	}
</style>
