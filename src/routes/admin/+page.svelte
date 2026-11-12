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
	let release = $derived(data.release);
	let iApproved = $derived(release.approvals.some((a) => a.email === data.adminEmail));

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

<h2>Publikasi hasil</h2>
<div class="panel">
	{#if data.isSuperAdmin}
		<form method="POST" action="?/resultsMode" use:enhance class="mode-form">
			<fieldset>
				<legend>Saat pemungutan suara ditutup</legend>
				<label class="choice">
					<input type="radio" name="mode" value="auto" checked={release.mode === 'auto'} />
					<span>
						<strong>Tampil otomatis.</strong> Perolehan suara langsung tampil di halaman Hasil.
					</span>
				</label>
				<label class="choice">
					<input type="radio" name="mode" value="manual" checked={release.mode === 'manual'} />
					<span>
						<strong>Tunggu tombol Publikasikan.</strong> Perolehan suara tidak tampil kepada siapa pun,
						termasuk admin, sampai dua admin menyetujui atau super admin mempublikasikan.
					</span>
				</label>
			</fieldset>
			<button class="button button-ghost" type="submit">Simpan mode (super admin)</button>
		</form>
		<form method="POST" action="?/resultsDetail" use:enhance class="mode-form">
			<fieldset>
				<legend>Yang ditampilkan kepada publik</legend>
				<label class="choice">
					<input type="radio" name="detail" value="counts" checked={release.detail === 'counts'} />
					<span>
						<strong>Jumlah suara dan persentase.</strong> Publik melihat jumlah DPT, jumlah yang sudah
						memilih, partisipasi, serta jumlah dan persentase suara setiap calon.
					</span>
				</label>
				<label class="choice">
					<input
						type="radio"
						name="detail"
						value="percent"
						checked={release.detail === 'percent'}
					/>
					<span>
						<strong>Persentase saja.</strong> Publik, termasuk calon, hanya melihat persentase suara setiap
						calon. Jumlah DPT, jumlah yang sudah memilih, dan partisipasi (selama dan sesudah pemungutan
						suara), jumlah suara, serta CSV surat suara disembunyikan, karena dari angka-angka itu jumlah
						suara bisa dihitung. Pemilih tetap bisa memeriksa kode tanda terimanya. Admin tetap melihat
						angka lengkap.
					</span>
				</label>
			</fieldset>
			<button class="button button-ghost" type="submit">Simpan rincian (super admin)</button>
		</form>
	{:else}
		<p>
			Mode: <strong
				>{release.mode === 'auto'
					? 'tampil otomatis saat ditutup'
					: 'tunggu tombol Publikasikan'}</strong
			>. Publik melihat:
			<strong
				>{release.detail === 'counts'
					? 'jumlah suara dan persentase'
					: 'persentase saja (tanpa jumlah suara, DPT, dan partisipasi)'}</strong
			>. Hanya super admin yang bisa mengubahnya.
		</p>
	{/if}

	{#if release.mode === 'manual'}
		<div class="publish">
			{#if release.published}
				<p class="msg-ok">Hasil sudah dipublikasikan dan tampil di halaman Hasil.</p>
			{:else if election.phase !== 'closed'}
				<p class="hint">Tombol Publikasikan muncul setelah pemungutan suara ditutup.</p>
			{:else}
				<p>
					Pemungutan suara sudah ditutup. Hasil belum tampil. Butuh persetujuan <strong
						>dua admin berbeda</strong
					>, atau satu super admin.
				</p>
				<form method="POST" action="?/publish" use:enhance>
					<button class="button" type="submit" disabled={iApproved}>
						{#if iApproved}
							Anda sudah menyetujui
						{:else if data.isSuperAdmin}
							Publikasikan hasil sekarang (super admin)
						{:else}
							Setujui publikasi hasil
						{/if}
					</button>
				</form>
			{/if}
			{#if release.approvals.length}
				<p class="hint">Disetujui oleh:</p>
				<ul class="approvals">
					{#each release.approvals as a (a.email)}
						<li>
							{a.email}, {formatWib(a.approvedAt)}{#if a.solo}
								<span class="tag">super admin, langsung</span>{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
	<p class="hint">
		Perubahan mode, rincian, dan setiap persetujuan tercatat di audit log. Persetujuan tidak bisa
		dibatalkan.
	</p>
</div>

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
		kode tanda terima, unduhan CSV surat suara, SHA-256) di halaman Hasil. Bagian audit hanya tampil
		jika dibuka di sini, dan baru berlaku setelah perolehan suara tampil (lihat
		<strong>Publikasi hasil</strong>). Perubahan tercatat di audit log.
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
	.mode-form fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		display: grid;
		gap: 10px;
	}

	.mode-form legend {
		margin-bottom: 8px;
		font-weight: 800;
	}

	.choice {
		display: flex;
		gap: 10px;
		align-items: flex-start;
	}

	.choice input {
		margin-top: 4px;
	}

	.mode-form .button {
		margin-top: 14px;
	}

	.mode-form + .mode-form {
		margin-top: 18px;
		padding-top: 18px;
		border-top: 1px solid var(--line);
	}

	.publish {
		margin-top: 18px;
		padding-top: 18px;
		border-top: 1px solid var(--line);
		display: grid;
		gap: 10px;
	}

	.approvals {
		margin: 0;
		padding-left: 20px;
		overflow-wrap: anywhere;
	}

	.tag {
		margin-left: 6px;
		font-size: 13px;
		font-weight: 800;
		color: var(--brown);
	}

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
