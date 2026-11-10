<!--
	Roset guilloche, pola cetak pengaman seperti pada uang kertas dan surat suara.
	Murni dekoratif; warnanya mengikuti `currentColor`.
-->
<script lang="ts">
	interface Props {
		/** Jumlah lengkung yang saling menyilang. */
		strands?: number;
		/** Jumlah gelombang per putaran. */
		waves?: number;
		/** Jari-jari dalam dan luar pita (dalam satuan viewBox 0..200). */
		inner?: number;
		outer?: number;
		strokeWidth?: number;
		class?: string;
	}

	let {
		strands = 14,
		waves = 9,
		inner = 62,
		outer = 96,
		strokeWidth = 0.6,
		class: className = ''
	}: Props = $props();

	function rosette(strands: number, waves: number, inner: number, outer: number): string[] {
		const mid = (inner + outer) / 2;
		const amp = (outer - inner) / 2;
		const steps = 360;
		const paths: string[] = [];
		for (let s = 0; s < strands; s++) {
			const phase = (s / strands) * ((2 * Math.PI) / waves);
			let d = '';
			for (let i = 0; i <= steps; i++) {
				const t = (i / steps) * 2 * Math.PI;
				const r = mid + amp * Math.sin(waves * t + phase) * Math.cos(2 * t + phase * 3);
				const x = 100 + r * Math.cos(t);
				const y = 100 + r * Math.sin(t);
				d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
			}
			paths.push(d + 'Z');
		}
		return paths;
	}

	let paths = $derived(rosette(strands, waves, inner, outer));
</script>

<svg class={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
	<g fill="none" stroke="currentColor" stroke-width={strokeWidth}>
		{#each paths as d, i (i)}<path {d} />{/each}
	</g>
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}
</style>
