<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let uploading = $state(false);
	let details = $derived<string[]>(
		form && 'details' in form && Array.isArray(form.details) ? form.details : []
	);
</script>

<svelte:head>
	<title>DPT · Admin Pemira</title>
</svelte:head>

<h1>Daftar pemilih tetap (DPT)</h1>

{#if form?.error}
	<div class="msg-error" role="alert">
		<p>{form.error}</p>
		{#if details.length}
			<ul>
				{#each details as line, i (i)}<li>{line}</li>{/each}
			</ul>
		{/if}
	</div>
{/if}
{#if form?.ok}<p class="msg-ok" role="status">{form.ok}</p>{/if}

<div class="panel count-panel">
	<p class="count"><strong>{data.count}</strong> pemilih terdaftar</p>
	{#if data.fingerprint}
		<p class="hint">Sidik jari DPT (SHA-256, umumkan saat DPT dikunci):</p>
		<p class="mono">{data.fingerprint}</p>
	{/if}
</div>

{#if data.locked}
	<p class="hint">DPT terkunci karena pemilihan sudah dibuka.</p>
{:else}
	<h2>Impor DPT</h2>
	<form
		method="POST"
		action="?/import"
		enctype="multipart/form-data"
		class="panel"
		use:enhance={() => {
			uploading = true;
			return async ({ update }) => {
				await update();
				uploading = false;
			};
		}}
	>
		<p class="hint">
			Berkas CSV dengan kolom <code>nim</code> dan <code>nama</code>, satu pemilih per baris (bisa
			diekspor dari Excel/Google Sheets dengan "Simpan sebagai CSV"). Kolom lain seperti email atau
			prodi boleh ada; kolom itu diabaikan dan tidak disimpan. Pemilih dicocokkan lewat NIM di email
			login (<code>nama.nim@student.itera.ac.id</code>). Impor
			<strong>mengganti seluruh DPT</strong> yang ada.
		</p>
		<pre class="mono example">nim,nama
122140001,Budi Simanjuntak
122140002,Ani Situmorang</pre>
		<label class="field">
			Berkas CSV
			<input type="file" name="file" accept=".csv,text/csv" required />
		</label>
		<button class="button" type="submit" disabled={uploading}>
			{uploading ? 'Mengimpor…' : 'Impor dan ganti DPT'}
		</button>
	</form>

	<p class="hint privacy">
		Berkas DPT berisi data pribadi. Jangan unggah ke repositori, grup chat, atau tempat publik.
	</p>
{/if}

<style>
	.count-panel {
		display: grid;
		gap: 8px;
	}

	.count {
		font-size: 15px;
		color: var(--ink-soft);
	}

	.count strong {
		margin-right: 8px;
		font-family: var(--font-mono);
		font-size: 40px;
		font-weight: 600;
		color: var(--brown-dark);
		vertical-align: -4px;
	}

	.example {
		margin: 14px 0 18px;
		padding: 14px 16px;
		border-radius: var(--radius-sm);
		background: var(--brown-dark);
		color: var(--gold-light);
		white-space: pre-wrap;
	}

	.msg-error ul {
		margin: 8px 0 0;
		padding-left: 20px;
	}

	.privacy {
		margin-top: 16px;
	}
</style>
