<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatWib } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let election = $derived(data.election);
	let p = $derived(data.participation);
	let locked = $derived(election.phase === 'open' || election.phase === 'closed');
	let percent = $derived(p.eligible ? Math.round((p.voted / p.eligible) * 1000) / 10 : 0);

	const PHASE_LABEL = {
		unscheduled: 'Belum dijadwalkan',
		upcoming: 'Terjadwal, belum dibuka',
		open: 'Sedang berlangsung',
		closed: 'Sudah ditutup'
	} as const;
</script>

<svelte:head>
	<title>Admin · Pemira PMK ITERA 2027</title>
</svelte:head>

<h1>Ringkasan</h1>

{#if form?.error}<p class="msg-error" role="alert">{form.error}</p>{/if}
{#if form?.ok}<p class="msg-ok" role="status">{form.ok}</p>{/if}

<div class="stats">
	<div class="stat">
		<p class="stat-label">Status</p>
		<p class="stat-value">{PHASE_LABEL[election.phase]}</p>
	</div>
	<div class="stat">
		<p class="stat-label">DPT</p>
		<p class="stat-value">{p.eligible}</p>
	</div>
	<div class="stat">
		<p class="stat-label">Sudah memilih</p>
		<p class="stat-value">{p.voted} <span class="stat-sub">({percent}%)</span></p>
	</div>
	<div class="stat">
		<p class="stat-label">Surat suara</p>
		<p class="stat-value">{p.ballots}</p>
	</div>
</div>

{#if p.voted !== p.ballots}
	<p class="msg-error" role="alert">
		Peringatan: jumlah pemilih yang sudah memilih ({p.voted}) tidak sama dengan jumlah surat suara ({p.ballots}).
		Hentikan proses dan periksa bersama saksi.
	</p>
{/if}

<h2>Jadwal</h2>
<form method="POST" action="?/schedule" use:enhance class="panel">
	<label class="field">
		Judul pemilihan
		<input name="title" value={election.title} required disabled={locked} />
	</label>
	<div class="row">
		<label class="field">
			Waktu buka (WIB)
			<input
				type="datetime-local"
				name="opens_at"
				value={data.opensInput}
				required
				disabled={locked}
			/>
		</label>
		<label class="field">
			Waktu tutup (WIB)
			<input
				type="datetime-local"
				name="closes_at"
				value={data.closesInput}
				required
				disabled={locked}
			/>
		</label>
	</div>
	{#if locked}
		<p class="hint">
			Jadwal terkunci sejak pemilihan dibuka ({formatWib(election.opensAt)}). Tutup: {formatWib(
				election.closesAt
			)}.
		</p>
	{:else}
		<p class="hint">
			Begitu waktu buka tiba, jadwal, DPT, dan daftar calon <strong>terkunci permanen</strong>.
			Pastikan DPT dan calon sudah final sebelum waktu buka.
		</p>
		<button class="button" type="submit">Simpan jadwal</button>
	{/if}
</form>

{#if election.phase === 'open'}
	<h2>Tutup darurat</h2>
	<form method="POST" action="?/close" use:enhance class="panel danger">
		<p class="hint">
			Menutup pemungutan suara sekarang juga. Tindakan ini permanen, tidak bisa dibuka kembali, dan
			tercatat di audit log.
		</p>
		<label class="field">
			Alasan
			<input name="reason" required />
		</label>
		<label class="field">
			Ketik <code>TUTUP</code> untuk konfirmasi
			<input name="confirm" required autocomplete="off" />
		</label>
		<button class="button button-danger" type="submit">Tutup pemungutan suara sekarang</button>
	</form>
{/if}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 12px;
		margin-top: 20px;
	}

	.stat {
		padding: 16px;
		background: var(--paper-light);
		border: 1px solid var(--line);
	}

	.stat-label {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.stat-value {
		margin-top: 6px;
		font: 600 26px var(--font-display);
	}

	.stat-sub {
		font: 400 14px var(--font-body);
		color: var(--ink-muted);
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0 16px;
	}

	.panel .hint {
		margin-bottom: 16px;
	}

	.danger {
		border-color: #c99a8c;
	}
</style>
