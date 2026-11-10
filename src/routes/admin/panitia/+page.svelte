<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { formatWib } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let copied = $state(false);

	let inviteText = $derived(
		form && 'invited' in form && form.invited
			? `Kamu diundang menjadi panitia Pemira PMK ITERA 2027. Buka ${page.url.origin}/masuk, ` +
					`pilih "Masuk dengan akun panitia", lalu masuk dengan akun Google ${form.invited}.`
			: null
	);

	async function copyInvite(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard tidak tersedia; teks tetap bisa disalin manual.
		}
	}
</script>

<svelte:head>
	<title>Panitia · Admin Pemira</title>
</svelte:head>

<h1>Panitia</h1>
<p class="hint intro">
	Admin bisa mengelola jadwal, calon, dan DPT. Hanya super admin yang bisa mengundang atau mencabut
	admin. Setiap undangan dan pencabutan tercatat di audit log.
</p>

{#if form?.error}<p class="msg-error" role="alert">{form.error}</p>{/if}
{#if form?.ok}<p class="msg-ok" role="status">{form.ok}</p>{/if}

{#if inviteText}
	<div class="panel invite-note">
		<p class="note-label">Kirim pesan ini ke admin baru</p>
		<p class="invite-text">{inviteText}</p>
		<button class="button button-ghost" type="button" onclick={() => copyInvite(inviteText)}>
			{copied ? 'Tersalin ✓' : 'Salin pesan'}
		</button>
	</div>
{/if}

<h2>Undang admin</h2>
<form method="POST" action="?/invite" use:enhance class="panel invite">
	<label class="field">
		Email akun Google
		<input
			type="email"
			name="email"
			required
			autocomplete="off"
			placeholder="nama@itera.ac.id"
			spellcheck="false"
		/>
	</label>
	<button class="button" type="submit">Undang admin</button>
	<p class="hint">
		Admin baru masuk lewat tombol <strong>Masuk dengan akun panitia</strong> di halaman masuk. Akun Google
		apa pun bisa diundang, tidak harus email ITERA.
	</p>
</form>

<h2>Daftar admin</h2>
<div class="scroll">
	<table>
		<thead>
			<tr
				><th>Email</th><th>Peran</th><th>Status</th><th
					><span class="visually-hidden">Aksi</span></th
				></tr
			>
		</thead>
		<tbody>
			{#each data.admins as a (a.email)}
				<tr>
					<td class="email">{a.email}</td>
					<td>
						<span class="role" class:super={a.role === 'super'}>
							{a.role === 'super' ? 'Super admin' : 'Admin'}
						</span>
					</td>
					<td class="status">
						{#if a.role === 'super'}
							Diatur lewat secret <code>SUPER_ADMIN_EMAILS</code>
						{:else}
							Diundang {a.invitedBy} · {formatWib(a.invitedAt)}<br />
							{a.lastLoginAt ? `Terakhir masuk ${formatWib(a.lastLoginAt)}` : 'Belum pernah masuk'}
						{/if}
					</td>
					<td class="actions">
						{#if a.role === 'admin'}
							<form
								method="POST"
								action="?/revoke"
								use:enhance={({ cancel }) => {
									if (!confirm(`Cabut akses admin ${a.email}?`)) cancel();
								}}
							>
								<input type="hidden" name="email" value={a.email} />
								<button class="revoke" type="submit">Cabut</button>
							</form>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.intro {
		max-width: 62ch;
		margin-top: 10px;
	}

	.invite {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		column-gap: 12px;
	}

	.invite .field {
		margin-bottom: 0;
	}

	.invite .hint {
		grid-column: 1 / -1;
		margin-top: 14px;
	}

	.invite-note {
		display: grid;
		justify-items: start;
		gap: 10px;
	}

	.note-label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--gold-dark);
	}

	.invite-text {
		max-width: 64ch;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--line);
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

	.email {
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	.role {
		display: inline-block;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--sand);
		font-size: 12px;
		font-weight: 800;
		white-space: nowrap;
		color: var(--brown-dark);
	}

	.role.super {
		background: var(--brown-dark);
		color: var(--gold-light);
	}

	.status {
		font-size: 13px;
		color: var(--ink-muted);
	}

	.actions {
		text-align: right;
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

	@media (max-width: 560px) {
		.invite {
			grid-template-columns: 1fr;
			row-gap: 12px;
		}
	}
</style>
