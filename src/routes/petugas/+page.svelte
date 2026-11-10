<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(timer);
	});

	// Kode terakhir disimpan di sini supaya tetap tampil saat petugas memakai Cek DPT.
	// Batas waktunya dihitung sejak hasil diterima; server tetap menjadi penentu.
	let current = $state<{ code: string; deadline: number } | null>(null);
	$effect(() => {
		if (form?.code && form.ttl)
			current = { code: form.code, deadline: Date.now() + form.ttl * 1000 };
	});
	let codeLeft = $derived(
		current === null ? null : Math.max(0, Math.ceil((current.deadline - now) / 1000))
	);

	function clock(seconds: number): string {
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>Petugas TPS · Pemira PMK ITERA 2027</title>
</svelte:head>

<section class="container page">
	<header class="rise">
		<p class="eyebrow">Petugas TPS</p>
		<h1>Satu kode untuk <em>satu pemilih.</em></h1>
		<p class="lead">Masuk sebagai <strong>{data.officerEmail}</strong>.</p>
	</header>

	<ol class="steps rise" style:--i="1">
		<li>Cocokkan KTM pemilih dengan DPT dan minta tanda tangan di absensi.</li>
		<li>Pemilih masuk dengan akun Google-nya sendiri di HP-nya, di area bilik.</li>
		<li>Tekan <strong>Buat kode</strong>, lalu ketik kodenya sendiri di HP pemilih.</li>
	</ol>

	{#if data.election.phase !== 'open'}
		<p class="msg msg-error rise" style:--i="2" role="status">
			Pemungutan suara sedang tidak dibuka, jadi kode belum bisa dibuat.
		</p>
	{:else}
		<div class="desk rise" style:--i="2">
			<form method="POST" action="?/create" use:enhance>
				<button class="button button-gold create" type="submit">Buat kode</button>
			</form>

			{#if form?.error}
				<p class="msg msg-error" role="alert">{form.error}</p>
			{/if}
			{#if current && codeLeft !== null}
				<div class="code-card" class:expired={codeLeft === 0} aria-live="polite">
					<p class="code-label">Kode TPS</p>
					<p class="code mono">{current.code}</p>
					<p class="code-time">
						{#if codeLeft > 0}
							Berlaku <strong class="mono">{clock(codeLeft)}</strong> lagi · sekali pakai
						{:else}
							Kedaluwarsa. Buat kode baru jika pemilih belum memasukkannya.
						{/if}
					</p>
				</div>
			{/if}
		</div>
	{/if}

	<div class="grid rise" style:--i="3">
		<section class="panel" aria-labelledby="stats-title">
			<h2 id="stats-title">Kode buatanmu</h2>
			<dl class="stats">
				<div>
					<dt>Dibuat</dt>
					<dd>{data.mine.created}</dd>
				</div>
				<div>
					<dt>Dipakai</dt>
					<dd>{data.mine.used}</dd>
				</div>
				<div>
					<dt>Kedaluwarsa</dt>
					<dd>{data.mine.expired}</dd>
				</div>
			</dl>
			<p class="hint">
				Di akhir hari, jumlah kode yang dipakai dicocokkan dengan jumlah tanda tangan di absensi.
			</p>
		</section>

		<section class="panel" aria-labelledby="check-title">
			<h2 id="check-title">Cek DPT</h2>
			<form method="POST" action="?/check" use:enhance class="check">
				<label class="visually-hidden" for="nim">NIM</label>
				<input
					class="code-input"
					id="nim"
					name="nim"
					inputmode="numeric"
					autocomplete="off"
					placeholder="NIM"
					required
				/>
				<button class="button button-ghost" type="submit">Cek</button>
			</form>
			{#if form?.checkError}
				<p class="msg msg-error" role="alert">{form.checkError}</p>
			{:else if form?.checked}
				<p class="msg {form.checked.name ? 'msg-ok' : 'msg-error'}" role="status">
					{#if form.checked.name}
						<span class="mono">{form.checked.nim}</span> terdaftar atas nama
						<strong>{form.checked.name}</strong>.
					{:else}
						<span class="mono">{form.checked.nim}</span> tidak ada di DPT.
					{/if}
				</p>
			{/if}
			<p class="hint">Hanya memeriksa DPT. Status sudah atau belum memilih tidak ditampilkan.</p>
		</section>
	</div>
</section>

<style>
	.page {
		padding-block: clamp(32px, 6vw, 72px) 32px;
	}

	h1 {
		margin-top: 16px;
		font-size: clamp(38px, 5.6vw, 64px);
		font-weight: 450;
	}

	.lead {
		margin-top: 14px;
		font-size: 17px;
		color: var(--ink-soft);
		overflow-wrap: anywhere;
	}

	.steps {
		display: grid;
		gap: 6px;
		max-width: 62ch;
		margin: 24px 0 0;
		padding-left: 22px;
		color: var(--ink-soft);
	}

	.desk {
		display: grid;
		justify-items: start;
		gap: 20px;
		margin-top: 32px;
	}

	.create {
		padding: 18px 36px;
		font-size: 18px;
	}

	.code-card {
		display: grid;
		gap: 8px;
		width: min(100%, 520px);
		padding: 24px 28px;
		border-radius: var(--radius);
		background: var(--brown-dark);
		color: var(--sand);
		box-shadow: var(--shadow-paper);
	}

	.code-label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--gold);
	}

	.code {
		font-size: clamp(44px, 12vw, 76px);
		font-weight: 600;
		line-height: 1.05;
		letter-spacing: 0.08em;
		color: var(--paper-light);
	}

	.code-time strong {
		color: var(--gold-light);
	}

	.expired .code {
		opacity: 0.35;
		text-decoration: line-through;
		text-decoration-thickness: 3px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 20px;
		margin-top: 40px;
	}

	.panel {
		display: grid;
		align-content: start;
		gap: 14px;
		padding: clamp(18px, 3vw, 28px);
		border-radius: var(--radius);
		background: var(--paper-light);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 1px rgb(215 201 179 / 0.8);
	}

	h2 {
		font-size: 24px;
		font-weight: 500;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin: 0;
	}

	.stats dt {
		font-size: 12px;
		font-weight: 800;
		color: var(--ink-muted);
	}

	.stats dd {
		margin: 0;
		font: 500 34px/1.1 var(--font-display);
	}

	.check {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.check input {
		flex: 1 1 12ch;
		min-width: 0;
	}

	.hint {
		font-size: 14px;
		color: var(--ink-muted);
	}

	.msg {
		margin: 0;
	}
</style>
