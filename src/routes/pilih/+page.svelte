<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import BallotHead from '#lib/components/BallotHead.svelte';
	import Guilloche from '#lib/components/Guilloche.svelte';
	import PunchHole from '#lib/components/PunchHole.svelte';
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
		<header class="page-head rise">
			<p class="eyebrow">Suara tercatat</p>
			<h1>Terima kasih sudah <em>memilih.</em></h1>
			<p class="lead">
				Simpan kode tanda terima di bawah ini. Setelah pemungutan suara ditutup, panitia akan
				memublikasikan daftar semua kode, dan kamu bisa memastikan suaramu tercatat dengan benar.
			</p>
		</header>

		<div class="ticket-wrap rise" style:--i="1">
			<div class="ticket">
				<div class="stub" aria-hidden="true">
					<div class="stub-seal">
						<Guilloche strands={12} waves={10} inner={50} outer={98} strokeWidth={1} />
					</div>
					<span class="stub-text">Pemira PMK ITERA 2027</span>
				</div>
				<div class="ticket-main">
					<p class="receipt-label">Kode tanda terima</p>
					<p class="receipt-code" aria-live="polite">{form.receiptCode}</p>
					<button class="button" type="button" onclick={() => copyCode(form.receiptCode)}>
						{copied ? 'Tersalin ✓' : 'Salin kode'}
					</button>
					<span class="recorded" aria-hidden="true">Tercatat</span>
				</div>
			</div>
		</div>

		<ul class="notes rise" style:--i="2">
			<li>
				<strong>Kode ini hanya ditampilkan sekali.</strong> Catat atau ambil tangkapan layar sekarang.
				Kode tidak disimpan bersama identitasmu, sehingga tidak bisa ditampilkan ulang.
			</li>
			<li>
				<strong>Rahasiakan kode ini.</strong> Jangan berikan kepada siapa pun, termasuk tim sukses calon.
			</li>
		</ul>
	{:else if data.election.phase !== 'open'}
		<header class="page-head notice rise">
			<p class="eyebrow">Surat suara</p>
			<h1>
				{#if data.election.phase === 'closed'}
					Pemungutan suara sudah <em>ditutup.</em>
				{:else}
					Pemungutan suara belum <em>dibuka.</em>
				{/if}
			</h1>
			<p class="lead">
				{data.election.phase === 'closed'
					? 'Hasil dan daftar surat suara sudah bisa dilihat.'
					: 'Lihat jadwal dan hitung mundurnya di beranda.'}
			</p>
			<a class="button" href={data.election.phase === 'closed' ? resolve('/hasil') : resolve('/')}>
				{data.election.phase === 'closed' ? 'Lihat hasil' : 'Kembali ke beranda'}
				<span class="arrow" aria-hidden="true">→</span>
			</a>
		</header>
	{:else if data.voterState === 'not_eligible'}
		<header class="page-head notice rise">
			<p class="eyebrow">Surat suara</p>
			<h1>Kamu tidak terdaftar di <em>DPT.</em></h1>
			<p class="lead">
				Kamu masuk sebagai <strong>{data.email}</strong>.
				{#if data.nim}
					NIM <strong class="mono">{data.nim}</strong> tidak ada di daftar pemilih.
				{:else}
					Email ini tidak memuat NIM mahasiswa, jadi tidak bisa dicocokkan dengan DPT.
				{/if}
				Jika kamu mahasiswa Kristen aktif ITERA dan merasa seharusnya terdaftar, hubungi panitia Pemira.
			</p>
		</header>
	{:else if data.voterState === 'already_voted'}
		<header class="page-head notice rise">
			<p class="eyebrow">Surat suara</p>
			<h1>Kamu sudah memberikan <em>suara.</em></h1>
			<p class="lead">
				Setiap pemilih hanya dapat memilih satu kali. Kode tanda terima hanya ditampilkan saat kamu
				memilih; gunakan kode yang sudah kamu simpan untuk memeriksa suaramu setelah hasil
				diumumkan.
			</p>
			<a class="button" href={resolve('/hasil')}>
				Buka halaman hasil <span class="arrow" aria-hidden="true">→</span>
			</a>
		</header>
	{:else}
		<header class="page-head rise">
			<p class="eyebrow">Surat suara</p>
			<h1>Coblos satu <em>calon ketua.</em></h1>
			<p class="lead">
				Kamu masuk sebagai <strong>{data.email}</strong>. Pilihanmu rahasia dan tidak bisa diubah
				setelah dikirim.
			</p>
		</header>

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
			<div class="sheet ballot rise" style:--i="1">
				<BallotHead title={data.election.title} hint="Coblos satu kotak calon" />
				<fieldset class="slots" disabled={confirming}>
					<legend class="visually-hidden">Calon ketua</legend>
					{#each data.candidates as c (c.id)}
						<label class="candidate" class:selected={selectedId === c.id}>
							<input
								class="visually-hidden"
								type="radio"
								name="candidate"
								value={c.id}
								bind:group={selectedId}
								required
							/>
							<span class="target" aria-hidden="true">
								{#if selectedId === c.id}<PunchHole />{/if}
							</span>
							<span class="cand-number" aria-hidden="true">{c.number}</span>
							<span class="cand-name"
								><span class="visually-hidden">Nomor {c.number}, </span>{c.name}</span
							>
							{#if c.vision}
								<span class="cand-text"><span class="tag">Visi</span>{c.vision}</span>
							{/if}
							{#if c.mission}
								<span class="cand-text"><span class="tag">Misi</span>{c.mission}</span>
							{/if}
						</label>
					{/each}
				</fieldset>
			</div>

			{#if form?.error}
				<p class="msg msg-error" role="alert">{form.error}</p>
			{/if}

			<div class="dock" class:confirming>
				{#if !confirming}
					<p class="dock-text">
						{#if selected}
							Pilihanmu: <strong>No. {selected.number} · {selected.name}</strong>
						{:else}
							Belum ada pilihan. Coblos satu kotak calon di atas.
						{/if}
					</p>
					<button
						class="button button-gold"
						type="button"
						disabled={selected === null}
						onclick={() => (confirming = true)}
					>
						Lanjut <span class="arrow" aria-hidden="true">→</span>
					</button>
				{:else if selected}
					<!-- Saat fieldset dinonaktifkan, radio tidak ikut terkirim; kirim lewat input tersembunyi. -->
					<input type="hidden" name="candidate" value={selected.id} />
					<div class="confirm" role="alertdialog" aria-labelledby="confirm-title">
						<p id="confirm-title" class="confirm-title">
							Kamu memilih <strong>No. {selected.number}, {selected.name}</strong>.
						</p>
						<p class="confirm-body">Suara yang sudah dikirim tidak bisa diubah. Kirim sekarang?</p>
					</div>
					<div class="confirm-actions">
						<button
							class="button button-gold"
							type="submit"
							disabled={submitting}
							{@attach (el) => el.focus()}
						>
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
				{/if}
			</div>
		</form>
	{/if}
</section>

<style>
	.page {
		padding-block: clamp(32px, 6vw, 72px) 32px;
	}

	.page-head {
		max-width: 760px;
	}

	.notice {
		padding-block: clamp(24px, 6vw, 64px);
	}

	.notice .button {
		margin-top: 28px;
	}

	h1 {
		margin-top: 16px;
		font-size: clamp(38px, 5.6vw, 64px);
		font-weight: 450;
	}

	.lead {
		max-width: 56ch;
		margin-top: 18px;
		font-size: 17px;
		color: var(--ink-soft);
	}

	.lead strong {
		color: var(--ink);
	}

	/* Surat suara */
	.ballot {
		margin-top: 36px;
	}

	.slots {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
		margin: 0;
		padding: 24px;
		border: 0;
	}

	.candidate {
		position: relative;
		display: grid;
		align-content: start;
		gap: 10px;
		min-height: 260px;
		padding: 20px;
		border: 1.5px solid var(--brown);
		border-radius: 4px;
		background: #fffdf8;
		cursor: pointer;
		transition:
			background-color 0.2s,
			box-shadow 0.2s,
			transform 0.2s var(--ease-out);
	}

	.candidate:hover {
		background: #fff;
		box-shadow: 0 10px 24px -14px rgb(68 46 22 / 0.5);
		transform: translateY(-2px);
	}

	.candidate.selected {
		background: #fff;
		box-shadow:
			inset 0 0 0 2px var(--brown),
			0 0 0 4px var(--gold-light);
	}

	.candidate:has(input:focus-visible) {
		outline: 3px solid var(--gold);
		outline-offset: 4px;
	}

	.target {
		position: absolute;
		top: 16px;
		right: 16px;
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		border: 1.5px dashed var(--line);
		border-radius: 50%;
		transition: border-color 0.2s;
	}

	.candidate:hover .target {
		border-color: var(--gold);
	}

	.selected .target {
		border-color: transparent;
	}

	.cand-number {
		font: italic 400 72px/0.85 var(--font-display);
		color: var(--gold-dark);
	}

	.cand-name {
		margin-top: 8px;
		font: 500 26px/1.15 var(--font-display);
	}

	.cand-text {
		font-size: 14px;
		color: var(--ink-soft);
	}

	.tag {
		display: inline-block;
		margin-right: 8px;
		padding: 1px 7px;
		border-radius: 4px;
		background: var(--sand);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--brown-dark);
		vertical-align: 1px;
	}

	fieldset:disabled .candidate {
		cursor: default;
		opacity: 0.5;
		transform: none;
		box-shadow: none;
	}

	fieldset:disabled .candidate.selected {
		opacity: 1;
		box-shadow:
			inset 0 0 0 2px var(--brown),
			0 0 0 4px var(--gold-light);
	}

	.msg {
		margin-top: 20px;
	}

	/* Bilah aksi yang menempel di bawah layar */
	.dock {
		position: sticky;
		bottom: 16px;
		z-index: 10;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
		margin-top: 24px;
		padding: 14px 14px 14px 24px;
		border-radius: 22px;
		background: var(--brown-dark);
		color: var(--sand);
		box-shadow: 0 20px 40px -16px rgb(44 30 17 / 0.6);
	}

	.dock-text strong {
		color: var(--paper-light);
	}

	.confirming {
		padding: 22px 24px;
	}

	.confirm-title {
		font: 400 22px/1.25 var(--font-display);
		color: var(--paper-light);
	}

	.confirm-title strong {
		font-weight: 600;
		color: var(--gold);
	}

	.confirm-body {
		margin-top: 4px;
		font-size: 15px;
	}

	.confirm-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.dock .button-ghost {
		color: var(--paper-light);
		box-shadow: inset 0 0 0 1.5px rgb(247 243 234 / 0.5);
	}

	.dock .button-ghost:hover {
		background: rgb(247 243 234 / 0.1);
	}

	/* Tanda terima: tiket dengan sobekan */
	.ticket-wrap {
		margin-top: 36px;
		max-width: 760px;
		filter: drop-shadow(0 18px 24px rgb(68 46 22 / 0.22))
			drop-shadow(0 2px 3px rgb(68 46 22 / 0.12));
	}

	.ticket {
		--cut: 150px;
		display: grid;
		grid-template-columns: var(--cut) 1fr;
		background: var(--paper-light);
		border-radius: 10px;
		mask:
			radial-gradient(circle 14px at var(--cut) 0, #0000 98%, #000) top / 100% 51% no-repeat,
			radial-gradient(circle 14px at var(--cut) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
	}

	.stub {
		display: grid;
		place-items: center;
		align-content: center;
		gap: 12px;
		padding: 24px 16px;
		background: var(--brown);
		color: var(--gold);
		border-radius: 10px 0 0 10px;
		border-right: 2px dashed var(--paper-light);
	}

	.stub-seal {
		width: 84px;
	}

	.stub-text {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-align: center;
		color: var(--gold-light);
	}

	.ticket-main {
		position: relative;
		display: grid;
		justify-items: start;
		gap: 10px;
		padding: 28px 32px 32px;
	}

	.receipt-label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.receipt-code {
		margin-bottom: 10px;
		font: 600 clamp(28px, 6.4vw, 52px) / 1.1 var(--font-mono);
		letter-spacing: 0.06em;
		color: var(--ink);
	}

	.recorded {
		position: absolute;
		right: 24px;
		bottom: 22px;
		padding: 6px 14px;
		border: 3px double var(--brown);
		border-radius: 8px;
		font: 800 16px var(--font-body);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--brown);
		transform: rotate(-8deg);
		opacity: 0.85;
		animation: stamp 0.5s 0.6s cubic-bezier(0.3, 1.5, 0.5, 1) both;
	}

	@keyframes stamp {
		from {
			opacity: 0;
			transform: rotate(-8deg) scale(1.8);
		}
	}

	.notes {
		display: grid;
		gap: 12px;
		max-width: 760px;
		margin: 32px 0 0;
		padding: 0;
		list-style: none;
	}

	.notes li {
		padding: 14px 18px;
		border-left: 3px solid var(--gold);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--paper-light);
		color: var(--ink-soft);
	}

	.notes strong {
		color: var(--ink);
	}

	@media (max-width: 600px) {
		.slots {
			padding: 16px;
			gap: 12px;
		}

		.candidate {
			min-height: 0;
		}

		.cand-number {
			font-size: 56px;
		}

		.dock {
			padding-left: 18px;
		}

		.dock > .button,
		.confirm-actions,
		.confirm-actions .button {
			width: 100%;
		}

		.ticket {
			--cut: 0px;
			grid-template-columns: 1fr;
			mask: none;
		}

		.stub {
			grid-auto-flow: column;
			justify-content: start;
			padding: 14px 20px;
			border-right: 0;
			border-bottom: 2px dashed var(--paper-light);
			border-radius: 10px 10px 0 0;
		}

		.stub-seal {
			width: 36px;
		}

		.ticket-main {
			padding: 24px 20px 28px;
		}

		.recorded {
			position: static;
			margin-top: 8px;
		}
	}
</style>
