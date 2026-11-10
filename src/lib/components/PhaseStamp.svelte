<!-- Stempel tinta yang menandai tahap pemilihan. -->
<script lang="ts">
	import type { ElectionPhase } from '#lib/server/election.js';

	let { phase, small = false }: { phase: ElectionPhase; small?: boolean } = $props();

	const LABEL: Record<ElectionPhase, string> = {
		unscheduled: 'Belum dijadwalkan',
		upcoming: 'Segera dibuka',
		open: 'Dibuka',
		closed: 'Ditutup'
	};
</script>

<span class="stamp" class:small data-phase={phase}>
	<span class="stamp-top">Pemira 2027</span>
	<span class="stamp-main">{LABEL[phase]}</span>
</span>

<style>
	.stamp {
		display: inline-grid;
		justify-items: center;
		gap: 2px;
		padding: 8px 16px 9px;
		border: 3px double currentColor;
		border-radius: 8px;
		color: var(--brown);
		transform: rotate(-5deg);
		text-transform: uppercase;
		line-height: 1;
		/* Tinta stempel tidak pernah rata */
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.2 1.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		mask-size: 120px;
	}

	.stamp[data-phase='upcoming'],
	.stamp[data-phase='unscheduled'] {
		color: var(--gold-dark);
	}

	.stamp[data-phase='closed'] {
		color: var(--ink-soft);
	}

	.stamp-top {
		font: 800 9px var(--font-body);
		letter-spacing: 0.22em;
	}

	.stamp-main {
		font: 800 20px var(--font-body);
		letter-spacing: 0.08em;
		white-space: nowrap;
	}

	.small {
		padding: 5px 10px 6px;
		border-width: 3px;
	}

	.small .stamp-main {
		font-size: 14px;
	}

	.small .stamp-top {
		font-size: 7px;
	}
</style>
