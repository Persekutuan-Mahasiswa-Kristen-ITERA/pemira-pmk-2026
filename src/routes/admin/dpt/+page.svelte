<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatWib } from '#lib/time.js';
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
	{#if data.baseFingerprint}
		<p class="hint">
			Sudah termasuk {data.additions.length} pemilih tambahan (daftar di bawah). Sidik jari DPT tanpa
			pemilih tambahan ({data.baseCount} pemilih), untuk dicocokkan dengan angka yang diumumkan:
		</p>
		<p class="mono">{data.baseFingerprint}</p>
	{/if}
</div>

{#if data.isSuperAdmin && data.phase !== 'closed'}
	<h2>Tambah pemilih (super admin)</h2>
	{#if form?.addError}<p class="msg-error" role="alert">{form.addError}</p>{/if}
	{#if form?.added}<p class="msg-ok" role="status">{form.added}</p>{/if}
	<form
		method="POST"
		action="?/add"
		class="panel"
		use:enhance={({ formData, cancel }) => {
			const nim = String(formData.get('nim') ?? '').trim();
			const name = String(formData.get('name') ?? '').trim();
			if (
				!confirm(
					`Tambahkan ${name} (NIM ${nim}) ke DPT?\n\nPastikan sudah dicek: mahasiswa aktif dan beragama Kristen Protestan. Penambahan ini permanen (tidak bisa dibatalkan atau dihapus) dan tercatat di audit log.`
				)
			)
				cancel();
		}}
	>
		<p class="hint">
			Untuk mahasiswa yang tidak tercantum di DPT tetapi sudah dicek panitia memenuhi syarat
			(mahasiswa aktif dan beragama Kristen Protestan). Bisa dipakai juga saat pemungutan suara
			berlangsung. Penambahan <strong>tidak bisa dibatalkan</strong>, tercatat di audit log, dan
			tampil di daftar di bawah untuk semua admin. Setelah ditambahkan, pemilih langsung bisa masuk
			dengan Google dan memilih di TPS seperti biasa.
		</p>
		<label class="field">
			NIM
			<input
				name="nim"
				inputmode="numeric"
				autocomplete="off"
				required
				placeholder="122140001"
				value={form?.values?.nim ?? ''}
			/>
		</label>
		<label class="field">
			Nama lengkap
			<input
				name="name"
				autocomplete="off"
				required
				minlength="2"
				maxlength="100"
				value={form?.values?.name ?? ''}
			/>
		</label>
		<label class="field">
			Alasan dan bukti pengecekan
			<textarea
				name="reason"
				rows="2"
				required
				minlength="3"
				maxlength="300"
				placeholder="Contoh: tidak ada di data kampus; dicek ke BAAK oleh Sarah, status aktif, agama Kristen Protestan"
				>{form?.values?.reason ?? ''}</textarea
			>
		</label>
		<button class="button" type="submit">Tambahkan ke DPT</button>
	</form>
{/if}

{#if data.additions.length}
	<h2>Pemilih tambahan</h2>
	<div class="scroll">
		<table>
			<thead>
				<tr>
					<th>Pemilih</th>
					<th>Alasan</th>
					<th>Ditambahkan</th>
				</tr>
			</thead>
			<tbody>
				{#each data.additions as a, i (i)}
					<tr>
						<td>
							<span class="mono">{a.nim}</span><br />{a.name}
							{#if !a.inDpt}<br /><em>Tidak ada lagi di DPT (DPT diganti lewat impor)</em>{/if}
						</td>
						<td class="reason">{a.reason}</td>
						<td class="meta">{a.addedBy}<br />{formatWib(a.addedAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if data.locked}
	<h2>Impor DPT</h2>
	<p class="hint">
		Impor DPT terkunci karena pemilihan sudah dibuka.{#if data.phase === 'open'}
			Pemilih yang terlewat hanya bisa ditambahkan satu per satu oleh super admin.{/if}
	</p>
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

	.scroll {
		margin-top: 16px;
		overflow-x: auto;
		border-radius: var(--radius);
		background: var(--paper-light);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 1px rgb(215 201 179 / 0.8);
	}

	.reason {
		max-width: 36ch;
	}

	.meta {
		font-size: 13px;
		color: var(--ink-muted);
		overflow-wrap: anywhere;
	}
</style>
