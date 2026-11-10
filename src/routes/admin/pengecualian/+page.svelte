<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatWib } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const STATUS: Record<string, string> = {
		pending: 'Menunggu persetujuan',
		active: 'Kode aktif',
		used: 'Dipakai',
		expired: 'Kedaluwarsa',
		cancelled: 'Dibatalkan'
	};
</script>

<svelte:head>
	<title>Kode pengecualian · Admin Pemira</title>
</svelte:head>

<h1>Kode pengecualian</h1>
<p class="hint intro">
	Untuk pemilih di TPS yang benar-benar tidak bisa masuk dengan Google, misalnya akunnya terkunci
	atau dinonaktifkan. Coba dulu browser lain atau reset akun lewat UPA TIK. Satu admin mengajukan,
	admin
	<strong>lain</strong> menyetujui dari perangkatnya sendiri. Kode berlaku 5 menit dan hanya bisa dipakai
	sekali. Daftar NIM yang memakai jalur ini diumumkan setelah pemilihan ditutup.
</p>

{#if form?.error}<p class="msg-error" role="alert">{form.error}</p>{/if}
{#if form?.ok}<p class="msg-ok" role="status">{form.ok}</p>{/if}

{#if form?.approved}
	<div class="panel approved" aria-live="polite">
		<p class="note-label">Kode untuk NIM {form.approved.nim}</p>
		<p class="code mono">{form.approved.code}</p>
		<p class="hint">
			Ketik kode ini sendiri di perangkat pemilih: halaman <strong>Masuk</strong> →
			<strong>Tidak bisa masuk dengan Google?</strong>. Kode hanya ditampilkan sekali, berlaku 5
			menit, dan sekali pakai.
		</p>
	</div>
{/if}

{#if data.election.phase !== 'open'}
	<p class="panel hint">Pengajuan hanya bisa dibuat saat pemungutan suara dibuka.</p>
{:else}
	<h2>Ajukan</h2>
	<form method="POST" action="?/request" use:enhance class="panel">
		<label class="field">
			NIM (cocokkan dengan KTM)
			<input name="nim" inputmode="numeric" autocomplete="off" required placeholder="122140001" />
		</label>
		<label class="field">
			Alasan
			<textarea
				name="reason"
				rows="2"
				required
				minlength="3"
				maxlength="300"
				placeholder="Contoh: akun student dinonaktifkan, sudah dicoba di dua browser"></textarea>
		</label>
		<button class="button" type="submit">Ajukan</button>
	</form>
{/if}

<h2>Daftar pengajuan</h2>
{#if data.exceptions.length === 0}
	<p class="panel hint">Belum ada pengajuan.</p>
{:else}
	<div class="scroll">
		<table>
			<thead>
				<tr>
					<th>Pemilih</th>
					<th>Alasan</th>
					<th>Diajukan</th>
					<th>Status</th>
					<th><span class="visually-hidden">Aksi</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.exceptions as e (e.id)}
					<tr>
						<td><span class="mono">{e.nim}</span><br />{e.name}</td>
						<td class="reason">{e.reason}</td>
						<td class="meta">
							{e.requestedBy}<br />{formatWib(e.requestedAt)}
							{#if e.approvedBy}<br />Disetujui {e.approvedBy}{/if}
						</td>
						<td><span class="status status-{e.status}">{STATUS[e.status]}</span></td>
						<td class="actions"
							><div class="action-row">
								{#if e.status === 'pending' && e.requestedBy !== data.me && data.election.phase === 'open'}
									<form
										method="POST"
										action="?/approve"
										use:enhance={({ cancel }) => {
											if (
												!confirm(
													`Sudah mencocokkan KTM ${e.name} (${e.nim})? Setujui dan buat kode?`
												)
											)
												cancel();
										}}
									>
										<input type="hidden" name="id" value={e.id} />
										<button class="button approve" type="submit">Setujui</button>
									</form>
								{/if}
								{#if e.status === 'pending' || e.status === 'active'}
									<form method="POST" action="?/cancel" use:enhance>
										<input type="hidden" name="id" value={e.id} />
										<button class="revoke" type="submit">Batalkan</button>
									</form>
								{/if}
							</div></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.intro {
		max-width: 66ch;
		margin-top: 10px;
	}

	.approved {
		display: grid;
		gap: 8px;
		background: var(--brown-dark);
		color: var(--sand);
	}

	.approved .hint {
		color: var(--sand);
	}

	.note-label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--gold);
	}

	.code {
		font-size: clamp(36px, 7vw, 56px);
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--paper-light);
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
		max-width: 28ch;
	}

	.meta {
		font-size: 13px;
		color: var(--ink-muted);
		overflow-wrap: anywhere;
	}

	.status {
		display: inline-block;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--sand);
		font-size: 12px;
		font-weight: 800;
		white-space: nowrap;
		color: var(--brown-dark);
	}

	.status-active {
		background: var(--brown-dark);
		color: var(--gold-light);
	}

	.status-cancelled,
	.status-expired {
		background: transparent;
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--ink-muted);
	}

	.action-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;
	}

	.approve {
		padding: 6px 16px;
		font-size: 13px;
	}

	.revoke {
		padding: 6px 14px;
		border: 0;
		border-radius: 999px;
		background: var(--danger-bg);
		box-shadow: inset 0 0 0 1px rgb(163 64 42 / 0.4);
		font: 800 13px var(--font-body);
		color: var(--danger-ink);
		cursor: pointer;
	}

	.revoke:hover {
		background: #f1d3c4;
	}
</style>
