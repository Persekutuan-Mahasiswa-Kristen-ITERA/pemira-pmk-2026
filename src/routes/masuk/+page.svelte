<script lang="ts">
	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);

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
			const response = await fetch(location.pathname, {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await response.text());

			if (result.type === 'success') {
				const target = result.data?.admin ? resolve('/admin') : resolve('/pilih');
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
	<p class="eyebrow">Masuk</p>
	<h1>Gunakan akun Google ITERA</h1>
	<p class="lead">
		Masuk dengan email <strong>nama.nim@{data.studentDomain}</strong>. NIM di emailmu dicocokkan
		dengan DPT; hanya mahasiswa yang terdaftar yang dapat memberikan suara.
	</p>

	<button class="button" type="button" onclick={() => login()} disabled={busy} aria-busy={busy}>
		{busy ? 'Memproses…' : 'Masuk dengan Google'}
	</button>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	<p class="committee">
		Panitia?
		<button type="button" class="link" onclick={() => login(true)} disabled={busy}>
			Masuk dengan akun panitia
		</button>
	</p>

	<p class="note">
		Kami hanya menerima alamat email dan nama dari Google; NIM di email dipakai untuk mencocokkan
		DPT. Pilihanmu tidak pernah disimpan bersama identitasmu.
	</p>
</section>

<style>
	.page {
		padding-block: 56px 96px;
	}

	.page > :global(*) {
		max-width: 640px;
	}

	h1 {
		margin-top: 16px;
		font-size: clamp(34px, 5vw, 52px);
	}

	.lead {
		margin: 18px 0 32px;
		font-size: 17px;
		color: var(--ink-soft);
	}

	.button:disabled {
		opacity: 0.7;
		cursor: progress;
	}

	.error {
		margin-top: 20px;
		padding: 14px 16px;
		border-left: 3px solid #a3402a;
		background: #f7e6dc;
		color: #6b2414;
		font-size: 15px;
	}

	.committee {
		margin-top: 20px;
		font-size: 14px;
		color: var(--ink-muted);
	}

	.link {
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-weight: 700;
		color: var(--brown);
		text-decoration: underline;
		cursor: pointer;
	}

	.note {
		margin-top: 40px;
		font-size: 13px;
		color: var(--ink-muted);
	}
</style>
