<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatWib } from '#lib/time.js';
	import PhaseStamp from '#lib/components/PhaseStamp.svelte';
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
	<div class="stat stat-phase">
		<p class="stat-label">Status</p>
		<p class="stat-value"><PhaseStamp phase={election.phase} small /></p>
		<p class="visually-hidden">{PHASE_LABEL[election.phase]}</p>
	</div>
	<div class="stat">
		<p class="stat-label">DPT</p>
		<p class="stat-value">{p.eligible}</p>
	</div>
	<div class="stat">
		<p class="stat-label">Sudah memilih</p>
		<p class="stat-value">{p.voted} <span class="stat-sub">{percent}%</span></p>
		<div class="mini-meter" aria-hidden="true"><span style:width="{percent}%"></span></div>
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

<h2>Rekonsiliasi TPS</h2>
<div class="panel tps">
	<dl class="tps-grid">
		<div>
			<dt>Kode TPS dibuat</dt>
			<dd>{data.tps.boothCodes.created}</dd>
		</div>
		<div>
			<dt>Kode TPS dipakai</dt>
			<dd>{data.tps.boothCodes.used}</dd>
		</div>
		<div>
			<dt>Kode TPS kedaluwarsa</dt>
			<dd>{data.tps.boothCodes.expired}</dd>
		</div>
		<div>
			<dt>Kode pengecualian dipakai</dt>
			<dd>{data.tps.exceptionsUsed}</dd>
		</div>
	</dl>
	<p class="hint">
		Di akhir hari, cocokkan <strong>kode TPS dipakai</strong> dengan jumlah tanda tangan di absensi. Jumlah
		kode yang dipakai (TPS dan pengecualian) boleh sedikit lebih banyak dari jumlah yang sudah memilih,
		karena pemilih yang waktunya habis memakai kode baru. Tetapi jumlah itu tidak boleh lebih sedikit.
	</p>
</div>

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

<h2>Audit suara publik</h2>
<form method="POST" action="?/audit" use:enhance class="panel audit-panel">
	<input type="hidden" name="enabled" value={data.auditPublic ? '0' : '1'} />
	<div class="audit-row">
		<p class="audit-state">
			<span class="audit-dot" class:on={data.auditPublic} aria-hidden="true"></span>
			{data.auditPublic ? 'Dibuka' : 'Ditutup'}
		</p>
		<button
			class="button"
			class:button-ghost={data.auditPublic}
			type="submit"
			role="switch"
			aria-checked={data.auditPublic}
		>
			{data.auditPublic ? 'Tutup audit suara' : 'Buka audit suara'}
		</button>
	</div>
	<p class="hint">
		Mengatur bagian <strong>Periksa suaramu</strong> dan <strong>Audit mandiri</strong> (pencarian
		kode tanda terima, unduhan CSV surat suara, SHA-256) di halaman Hasil. Perolehan suara tetap
		tampil begitu pemungutan suara ditutup; bagian audit hanya tampil jika dibuka di sini
		{#if election.phase !== 'closed'}dan baru berlaku setelah pemungutan suara ditutup{/if}.
		Perubahan tercatat di audit log.
	</p>
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
			<span>Ketik <code>TUTUP</code> untuk konfirmasi</span>
			<input name="confirm" required autocomplete="off" />
		</label>
		<button class="button button-danger" type="submit">Tutup pemungutan suara sekarang</button>
	</form>
{/if}

<style>
	.audit-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.audit-state {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-weight: 600;
	}

	.audit-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--line);
	}

	.audit-dot.on {
		background: var(--ok-line);
	}

	.tps {
		display: grid;
		gap: 14px;
	}

	.tps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 12px;
		margin: 0;
	}

	.tps-grid dt {
		font-size: 12px;
		font-weight: 800;
		color: var(--ink-muted);
	}

	.tps-grid dd {
		margin: 0;
		font: 500 30px/1.1 var(--font-display);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 12px;
		margin-top: 24px;
	}

	.stat {
		position: relative;
		display: grid;
		align-content: space-between;
		gap: 10px;
		min-height: 118px;
		padding: 18px 20px;
		border-radius: var(--radius);
		background: var(--paper-light);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 1px rgb(215 201 179 / 0.8);
	}

	.stat-phase {
		background: var(--brown-dark);
		box-shadow: var(--shadow-soft);
	}

	.stat-phase .stat-label {
		color: var(--gold);
	}

	.stat-phase :global(.stamp) {
		color: var(--gold-light);
	}

	.stat-label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.stat-value {
		font: 600 36px/1 var(--font-mono);
		color: var(--brown-dark);
	}

	.stat-sub {
		font: 700 14px var(--font-body);
		color: var(--gold-dark);
	}

	.mini-meter {
		height: 6px;
		border-radius: 999px;
		background: var(--sand);
		overflow: hidden;
	}

	.mini-meter span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--brown), var(--gold));
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0 16px;
	}

	.panel .hint {
		margin-bottom: 18px;
	}

	form.panel.danger {
		background: var(--danger-bg);
		box-shadow: inset 0 0 0 1.5px rgb(163 64 42 / 0.4);
	}

	.danger .hint {
		color: var(--danger-ink);
	}
</style>
