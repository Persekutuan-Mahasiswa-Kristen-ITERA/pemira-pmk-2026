<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let selectedId = $state<number | null>(null);
	let confirming = $state(false);
	let submitting = $state(false);
	let copied = $state(false);

	let selected = $derived(data.candidates.find((c) => c.id === selectedId) ?? null);

	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard tidak tersedia; pengguna tetap bisa mencatat kode secara manual.
		}
	}
</script>

<svelte:head>
	<title>Surat suara · Pemira PMK ITERA 2027</title>
</svelte:head>

<section class="container page">
	{#if form?.receiptCode}
		<p class="eyebrow">Suara tercatat</p>
		<h1>Terima kasih sudah memilih.</h1>
		<p class="lead">
			Simpan kode tanda terima di bawah ini. Setelah pemungutan suara ditutup, panitia akan
			memublikasikan daftar semua kode, dan kamu bisa memastikan suaramu tercatat dengan benar.
		</p>

		<div class="receipt">
			<p class="receipt-label">Kode tanda terima</p>
			<p class="receipt-code" aria-live="polite">{form.receiptCode}</p>
			<button class="button" type="button" onclick={() => copyCode(form.receiptCode)}>
				{copied ? 'Tersalin ✓' : 'Salin kode'}
			</button>
		</div>

		<ul class="notes">
			<li>
				<strong>Kode ini hanya ditampilkan sekali.</strong> Catat atau ambil tangkapan layar sekarang.
				Kode tidak disimpan bersama identitasmu, sehingga tidak bisa ditampilkan ulang.
			</li>
			<li>Jangan berikan kode ini kepada siapa pun, termasuk tim sukses calon.</li>
		</ul>
	{:else if data.election.phase !== 'open'}
		<p class="eyebrow">Surat suara</p>
		<h1>
			{data.election.phase === 'closed'
				? 'Pemungutan suara sudah ditutup.'
				: 'Pemungutan suara belum dibuka.'}
		</h1>
		<p class="lead">
			Kembali ke <a href={resolve('/')}>beranda</a> untuk melihat jadwal.
		</p>
	{:else if data.voterState === 'not_eligible'}
		<p class="eyebrow">Surat suara</p>
		<h1>Email kamu tidak terdaftar di DPT.</h1>
		<p class="lead">
			Kamu masuk sebagai <strong>{data.email}</strong>. Jika kamu mahasiswa Kristen aktif ITERA dan
			merasa seharusnya terdaftar, hubungi panitia Pemira.
		</p>
	{:else if data.voterState === 'already_voted'}
		<p class="eyebrow">Surat suara</p>
		<h1>Kamu sudah memberikan suara.</h1>
		<p class="lead">
			Setiap pemilih hanya dapat memilih satu kali. Kode tanda terima hanya ditampilkan saat kamu
			memilih; gunakan kode yang sudah kamu simpan untuk memeriksa suaramu setelah hasil diumumkan.
		</p>
	{:else}
		<p class="eyebrow">Surat suara</p>
		<h1>Pilih satu calon ketua.</h1>
		<p class="lead">
			Kamu masuk sebagai <strong>{data.email}</strong>. Pilihanmu rahasia dan tidak bisa diubah
			setelah dikirim.
		</p>

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
					confirming = false;
				};
			}}
		>
			<fieldset class="ballot" disabled={confirming}>
				<legend class="visually-hidden">Calon ketua</legend>
				{#each data.candidates as c (c.id)}
					<label class="candidate" class:selected={selectedId === c.id}>
						<input type="radio" name="candidate" value={c.id} bind:group={selectedId} required />
						<span class="cand-number" aria-hidden="true">{c.number}</span>
						<span class="cand-body">
							<span class="cand-name">{c.name}</span>
							{#if c.vision}<span class="cand-text"><b>Visi.</b> {c.vision}</span>{/if}
							{#if c.mission}<span class="cand-text"><b>Misi.</b> {c.mission}</span>{/if}
						</span>
					</label>
				{/each}
			</fieldset>

			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}

			{#if !confirming}
				<button
					class="button"
					type="button"
					disabled={selected === null}
					onclick={() => (confirming = true)}
				>
					Lanjut
				</button>
			{:else if selected}
				<!-- Saat fieldset dinonaktifkan, radio tidak ikut terkirim; kirim lewat input tersembunyi. -->
				<input type="hidden" name="candidate" value={selected.id} />
				<div class="confirm" role="alertdialog" aria-labelledby="confirm-title">
					<p id="confirm-title" class="confirm-title">
						Kamu memilih <strong>No. {selected.number}, {selected.name}</strong>.
					</p>
					<p>Suara yang sudah dikirim tidak bisa diubah. Kirim sekarang?</p>
					<div class="confirm-actions">
						<button class="button" type="submit" disabled={submitting}>
							{submitting ? 'Mengirim…' : 'Ya, kirim suara saya'}
						</button>
						<button
							class="button button-ghost"
							type="button"
							disabled={submitting}
							onclick={() => (confirming = false)}
						>
							Ubah pilihan
						</button>
					</div>
				</div>
			{/if}
		</form>
	{/if}
</section>

<style>
	.page {
		padding-block: 56px 96px;
	}

	.page > :global(*) {
		max-width: 760px;
	}

	h1 {
		margin-top: 16px;
		font-size: clamp(32px, 5vw, 50px);
	}

	.lead {
		margin: 18px 0 32px;
		font-size: 17px;
		color: var(--ink-soft);
	}

	.lead a {
		color: var(--brown);
		font-weight: 700;
	}

	.ballot {
		margin: 0 0 28px;
		padding: 0;
		border: 0;
		display: grid;
		gap: 14px;
	}

	.candidate {
		display: flex;
		gap: 18px;
		align-items: flex-start;
		padding: 20px;
		background: var(--paper-light);
		border: 2px solid var(--line);
		cursor: pointer;
	}

	.candidate:hover {
		border-color: var(--gold);
	}

	.candidate.selected {
		border-color: var(--brown);
		background: #fff;
	}

	.candidate:has(input:focus-visible) {
		outline: 3px solid var(--gold);
		outline-offset: 3px;
	}

	.candidate input {
		margin-top: 8px;
		accent-color: var(--brown);
		width: 18px;
		height: 18px;
		flex: none;
	}

	.cand-number {
		flex: none;
		font: 600 34px/1 var(--font-display);
		color: var(--gold-dark);
	}

	.cand-body {
		display: grid;
		gap: 6px;
	}

	.cand-name {
		font: 600 24px/1.2 var(--font-display);
	}

	.cand-text {
		font-size: 14px;
		color: var(--ink-soft);
	}

	fieldset:disabled .candidate {
		cursor: default;
		opacity: 0.6;
	}

	fieldset:disabled .candidate.selected {
		opacity: 1;
	}

	.button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.button-ghost {
		background: transparent;
		color: var(--brown);
		box-shadow: inset 0 0 0 2px var(--brown);
	}

	.button-ghost:hover {
		background: var(--paper-light);
	}

	.confirm {
		padding: 22px;
		background: var(--sand);
		border-left: 4px solid var(--brown);
	}

	.confirm-title {
		font-size: 18px;
		margin-bottom: 6px;
	}

	.confirm-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 18px;
	}

	.error {
		margin: 0 0 20px;
		padding: 14px 16px;
		border-left: 3px solid #a3402a;
		background: #f7e6dc;
		color: #6b2414;
		font-size: 15px;
	}

	.receipt {
		display: grid;
		justify-items: start;
		gap: 10px;
		padding: 28px;
		background: #fff;
		border: 2px dashed var(--brown);
	}

	.receipt-label {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.receipt-code {
		font:
			700 clamp(30px, 8vw, 46px) / 1.1 ui-monospace,
			'SF Mono',
			Menlo,
			monospace;
		letter-spacing: 0.08em;
		margin-bottom: 8px;
	}

	.notes {
		margin: 28px 0 0;
		padding-left: 20px;
		display: grid;
		gap: 10px;
		color: var(--ink-soft);
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
