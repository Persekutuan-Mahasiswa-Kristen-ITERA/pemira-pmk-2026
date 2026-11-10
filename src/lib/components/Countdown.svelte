<!--
	Hitung mundur ke suatu waktu (detik Unix). Di server hanya menampilkan tanda kosong supaya
	tidak bergantung pada jam server; angka mulai berjalan setelah halaman aktif di browser.
	Saat waktunya tiba, data halaman dimuat ulang agar tahap pemilihan ikut berganti.
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { target, label }: { target: number; label: string } = $props();

	let now = $state<number | null>(null);

	$effect(() => {
		now = Date.now() / 1000;
		let refreshed = false;
		const timer = setInterval(() => {
			now = Date.now() / 1000;
			if (!refreshed && now >= target) {
				refreshed = true;
				invalidateAll();
			}
		}, 1000);
		return () => clearInterval(timer);
	});

	let parts = $derived.by(() => {
		if (now === null) {
			return ['hari', 'jam', 'menit', 'detik'].map((unit) => ({ value: null, unit }));
		}
		let left = Math.max(0, Math.floor(target - now));
		const days = Math.floor(left / 86400);
		left -= days * 86400;
		const hours = Math.floor(left / 3600);
		left -= hours * 3600;
		const minutes = Math.floor(left / 60);
		return [
			{ value: days, unit: 'hari' },
			{ value: hours, unit: 'jam' },
			{ value: minutes, unit: 'menit' },
			{ value: left - minutes * 60, unit: 'detik' }
		];
	});

	const pad = (n: number | null) => (n === null ? '--' : String(n).padStart(2, '0'));
</script>

<div class="countdown" role="timer" aria-label={label}>
	{#each parts as part (part.unit)}
		<span class="cell">
			<span class="value">{pad(part.value)}</span>
			<span class="unit">{part.unit}</span>
		</span>
	{/each}
</div>

<style>
	.countdown {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
	}

	.cell {
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 10px 4px 8px;
		border-radius: var(--radius-sm);
		background: var(--brown-dark);
		color: var(--paper-light);
	}

	.value {
		font: 600 clamp(22px, 4vw, 30px) / 1 var(--font-mono);
		font-variant-numeric: tabular-nums;
	}

	.unit {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--gold-light);
	}
</style>
