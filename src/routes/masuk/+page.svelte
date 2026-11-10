<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Guilloche from '#lib/components/Guilloche.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);

	// Mode demo: cari dan pilih pengguna dummy.
	let query = $state('');
	let picked = $state('');
	let demoMatches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const users = data.demoUsers ?? [];
		return q ? users.filter((u) => `${u.email} ${u.label}`.toLowerCase().includes(q)) : users;
	});
	let demoGroups = $derived(
		(['super', 'admin', 'officer', 'voter', 'outsider'] as const)
			.map((group) => ({
				label: data.demoGroupLabels[group],
				users: demoMatches.filter((u) => u.group === group)
			}))
			.filter((g) => g.users.length > 0)
	);
	/** Email yang diketik langsung (tidak ada di daftar) juga boleh dipakai. */
	let typedEmail = $derived(query.includes('@') && demoMatches.length === 0 ? query.trim() : '');

	const FIREBASE_MESSAGES: Record<string, string> = {
		'auth/popup-blocked':
			'Jendela login diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.',
		'auth/network-request-failed': 'Koneksi internet bermasalah. Periksa koneksi lalu coba lagi.',
		'auth/unauthorized-domain': 'Domain ini belum diizinkan untuk login. Hubungi panitia.'
	};
	const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

	/** @param asCommittee panitia/admin boleh memakai akun di luar domain mahasiswa */
	async function login(asCommittee = false) {
		busy = true;
		error = null;
		try {
			const { signInWithGoogle } = await import('#lib/firebase.js');
			let idToken: string;
			try {
				idToken = await signInWithGoogle(asCommittee ? undefined : data.studentDomain);
			} catch (err) {
				const code = (err as { code?: string }).code ?? '';
				if (!SILENT.has(code)) {
					error = FIREBASE_MESSAGES[code] ?? 'Login gagal. Silakan coba lagi.';
				}
				return;
			}

			const body = new FormData();
			body.set('idToken', idToken);
			const response = await fetch(`${location.pathname}?/google`, {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await response.text());

			if (result.type === 'success') {
				const kind = result.data?.target;
				const target =
					kind === 'admin'
						? resolve('/admin')
						: kind === 'officer'
							? resolve('/petugas')
							: resolve('/pilih');
				await goto(target, { invalidateAll: true });
			} else if (result.type === 'failure') {
				error = String(result.data?.error ?? 'Login gagal.');
			} else {
				error = 'Terjadi kesalahan di server. Silakan coba lagi.';
			}
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Masuk · Pemira PMK ITERA 2027</title>
</svelte:head>

<section class="container page">
	<div class="card rise">
		<div class="pane-form">
			<p class="eyebrow">Masuk</p>
			<h1>Gunakan akun Google <em>ITERA</em></h1>
			<p class="lead">
				Masuk dengan email mahasiswamu di TPS. Hanya mahasiswa yang terdaftar di DPT yang dapat
				memberikan suara, dan surat suara baru terbuka setelah petugas mengetik kode TPS.
			</p>

			{#if data.demoUsers}
				<form method="POST" action="?/impersonate" class="demo" use:enhance>
					<p class="demo-label">Mode demo · masuk sebagai</p>
					<label class="visually-hidden" for="demo-search">Cari pengguna</label>
					<input
						id="demo-search"
						class="demo-search"
						type="search"
						placeholder="Cari nama, NIM, atau email…"
						autocomplete="off"
						bind:value={query}
					/>
					<label class="visually-hidden" for="demo-user">Pengguna</label>
					<select id="demo-user" name="email" size="8" bind:value={picked} required>
						{#if typedEmail}
							<option value={typedEmail}>Masuk sebagai {typedEmail}</option>
						{/if}
						{#each demoGroups as group (group.label)}
							<optgroup label={group.label}>
								{#each group.users as user (user.email)}
									<option value={user.email}>
										{user.label}{user.label === user.email ? '' : ` — ${user.email}`}
									</option>
								{/each}
							</optgroup>
						{/each}
					</select>
					<button class="button button-gold" type="submit" disabled={!picked}>
						Masuk sebagai pengguna ini <span class="arrow" aria-hidden="true">→</span>
					</button>
					{#if form?.demoError}
						<p class="msg msg-error" role="alert">{form.demoError}</p>
					{/if}
				</form>
			{:else}
				<button
					class="button google"
					type="button"
					onclick={() => login()}
					disabled={busy}
					aria-busy={busy}
				>
					<span class="g" aria-hidden="true">
						<svg viewBox="0 0 48 48" width="18" height="18"
							><path
								fill="#EA4335"
								d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
							/><path
								fill="#4285F4"
								d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
							/><path
								fill="#FBBC05"
								d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
							/><path
								fill="#34A853"
								d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
							/></svg
						>
					</span>
					{busy ? 'Memproses…' : 'Masuk dengan Google'}
				</button>
			{/if}

			{#if error}
				<p class="msg msg-error" role="alert">{error}</p>
			{/if}

			<details class="code-login" open={Boolean(form?.codeError)}>
				<summary>Tidak bisa masuk dengan Google?</summary>
				<p class="code-hint">
					Datang ke meja panitia di TPS dengan KTM. Jika akunmu memang tidak bisa dipakai, dua admin
					akan memberimu kode sekali pakai.
				</p>
				<form method="POST" action="?/code" use:enhance class="code-form">
					<label class="visually-hidden" for="exception-code">Kode dari panitia</label>
					<input
						class="code-input"
						id="exception-code"
						name="code"
						required
						autocomplete="off"
						autocapitalize="characters"
						spellcheck="false"
						placeholder="XXXX-XXXX"
						maxlength="12"
					/>
					<button class="button button-ghost" type="submit">Masuk dengan kode</button>
				</form>
				{#if form?.codeError}
					<p class="msg msg-error" role="alert">{form.codeError}</p>
				{/if}
			</details>

			{#if !data.demoUsers}
				<p class="committee">
					Panitia?
					<button type="button" class="link" onclick={() => login(true)} disabled={busy}>
						Masuk dengan akun panitia
					</button>
				</p>
			{/if}
		</div>

		<aside class="pane-info" aria-label="Cara pemilih dicocokkan">
			<div class="watermark" aria-hidden="true">
				<Guilloche strands={16} waves={9} inner={36} outer={98} strokeWidth={0.4} />
			</div>
			<p class="info-label">Yang dicocokkan dengan DPT</p>
			<p class="anatomy">
				<span class="part">nama.</span><mark>nim</mark><span class="part"
					>@{data.studentDomain}</span
				>
			</p>
			<p class="info-body">
				NIM di emailmu dicocokkan dengan daftar pemilih tetap. Email dibuat oleh kampus, jadi NIM di
				dalamnya dapat dipercaya.
			</p>
			<p class="note">
				Kami hanya menerima alamat email dan nama dari Google. Pilihanmu tidak pernah disimpan
				bersama identitasmu.
			</p>
		</aside>
	</div>
</section>

<style>
	.page {
		padding-block: clamp(32px, 6vw, 80px);
	}

	.card {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		max-width: 1000px;
		margin-inline: auto;
		border-radius: 24px;
		overflow: hidden;
		background: var(--paper-light);
		box-shadow:
			var(--shadow-paper),
			inset 0 0 0 1px rgb(215 201 179 / 0.7);
	}

	.pane-form {
		padding: clamp(28px, 5vw, 56px);
	}

	h1 {
		margin-top: 18px;
		font-size: clamp(34px, 4.6vw, 52px);
		font-weight: 450;
	}

	.lead {
		max-width: 40ch;
		margin: 18px 0 32px;
		font-size: 17px;
		color: var(--ink-soft);
	}

	.demo {
		display: grid;
		gap: 10px;
		padding: 16px;
		border: 1.5px dashed var(--gold-dark);
		border-radius: var(--radius-sm);
		background: rgb(229 210 154 / 0.25);
	}

	.demo-label {
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--gold-dark);
	}

	.demo-search,
	.demo select {
		width: 100%;
		padding: 10px 12px;
		border: 1.5px solid var(--line);
		border-radius: var(--radius-sm);
		background: #fff;
		font: 15px var(--font-body);
		color: var(--ink);
	}

	.demo select {
		padding: 6px;
	}

	.demo option {
		padding: 4px 6px;
		border-radius: 4px;
	}

	.demo-search:focus,
	.demo select:focus {
		outline: none;
		border-color: var(--gold);
		box-shadow: 0 0 0 4px rgb(197 154 39 / 0.25);
	}

	.google {
		padding-left: 8px;
	}

	.g {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #fff;
	}

	.google:disabled {
		cursor: progress;
	}

	.msg {
		margin-top: 20px;
	}

	.code-login {
		margin-top: 28px;
		font-size: 14px;
		color: var(--ink-soft);
	}

	.code-login summary {
		width: fit-content;
		font-weight: 800;
		color: var(--brown);
		cursor: pointer;
	}

	.code-hint {
		max-width: 46ch;
		margin-top: 10px;
	}

	.code-form {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 14px;
	}

	.code-form input {
		flex: 1 1 12ch;
		min-width: 0;
		max-width: 18ch;
	}

	.committee {
		margin-top: 32px;
		padding-top: 20px;
		border-top: 1px dashed var(--line);
		font-size: 14px;
		color: var(--ink-muted);
	}

	.link {
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-weight: 800;
		color: var(--brown);
		text-decoration: underline;
		text-decoration-color: var(--gold);
		text-underline-offset: 3px;
		cursor: pointer;
	}

	.pane-info {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: clamp(28px, 5vw, 48px);
		background: var(--brown-dark);
		color: var(--sand);
	}

	.watermark {
		position: absolute;
		z-index: -1;
		right: -55%;
		bottom: -55%;
		width: 120%;
		color: var(--gold);
		opacity: 0.16;
	}

	.info-label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--gold);
	}

	.anatomy {
		font: 500 clamp(15px, 1.8vw, 18px) / 1.5 var(--font-mono);
		color: var(--paper-light);
		word-break: break-all;
	}

	.part {
		opacity: 0.6;
	}

	mark {
		padding: 2px 6px;
		margin-inline: 1px;
		border-radius: 6px;
		background: var(--gold);
		color: var(--ink);
		font-weight: 600;
	}

	.info-body {
		font-size: 15px;
	}

	.note {
		margin-top: auto;
		padding-top: 24px;
		font-size: 13px;
		color: var(--gold-light);
		opacity: 0.85;
	}

	@media (max-width: 760px) {
		.card {
			grid-template-columns: 1fr;
		}
	}
</style>
