<!-- Lubang bekas coblosan paku pada surat suara. Dekoratif. -->
<script lang="ts">
	// Tepi sobekan yang tetap sama di server dan browser (tanpa Math.random).
	const POINTS = 22;
	const edge = Array.from({ length: POINTS }, (_, i) => {
		const t = (i / POINTS) * Math.PI * 2;
		const r = i % 2 ? 15 : 19 + ((i * 7) % 5) - 2;
		return `${(32 + r * Math.cos(t)).toFixed(1)},${(32 + r * Math.sin(t)).toFixed(1)}`;
	}).join(' ');
</script>

<svg class="hole" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
	<defs>
		<radialGradient id="hole-depth" cx="45%" cy="40%" r="60%">
			<stop offset="0" stop-color="#120b05" />
			<stop offset="0.7" stop-color="#2c1e11" />
			<stop offset="1" stop-color="#554a3b" />
		</radialGradient>
	</defs>
	<polygon points={edge} fill="#dfcfad" transform="translate(1.5 2)" opacity="0.9" />
	<polygon points={edge} fill="url(#hole-depth)" />
</svg>

<style>
	.hole {
		display: block;
		width: 100%;
		height: 100%;
		animation: punch 0.45s cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}

	@keyframes punch {
		from {
			transform: scale(1.8) rotate(-30deg);
			opacity: 0;
		}
	}
</style>
