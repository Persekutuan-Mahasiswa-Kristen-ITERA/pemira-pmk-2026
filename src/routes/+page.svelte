<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let election = $derived(data.election);

	const formatter = new Intl.DateTimeFormat('id-ID', {
		dateStyle: 'full',
		timeStyle: 'short',
		timeZone: 'Asia/Jakarta'
	});
	const when = (seconds: number | null) =>
		seconds === null ? '' : `${formatter.format(new Date(seconds * 1000))} WIB`;

	const PHASE_LABEL = {
		unscheduled: 'Jadwal belum diumumkan',
		upcoming: 'Segera dibuka',
		open: 'Pemungutan suara dibuka',
		closed: 'Pemungutan suara ditutup'
	} as const;

	const steps = [
		{
			title: 'Masuk dengan email ITERA',
			body: 'Gunakan akun Google nama.nim@student.itera.ac.id yang terdaftar di DPT.'
		},
		{
			title: 'Pilih satu calon',
			body: 'Baca visi dan misi, pilih satu calon, lalu konfirmasi pilihanmu.'
		},
		{
			title: 'Simpan kode tanda terima',
			body: 'Kode acak ini hanya kamu yang tahu. Gunakan untuk memastikan suaramu tercatat saat hasil diumumkan.'
		}
	];
</script>

<svelte:head>
	<title>Pemira PMK ITERA 2027</title>
	<meta
		name="description"
		content="Pemilihan Ketua PMK ITERA 2027: e-voting rahasia, terbuka untuk diaudit."
	/>
</svelte:head>

<section class="container hero" aria-labelledby="judul">
	<p class="eyebrow">Pemilihan Raya · PMK ITERA</p>
	<h1 id="judul">{election.title}</h1>
	<p class="lead">
		Satu suara dari setiap anggota untuk menentukan arah pelayanan. Rahasia, tercatat sekali, dan
		bisa diperiksa siapa saja.
	</p>

	<div class="status" data-phase={election.phase}>
		<span class="status-dot" aria-hidden="true"></span>
		<div>
			<p class="status-label">{PHASE_LABEL[election.phase]}</p>
			{#if election.phase === 'upcoming'}
				<p>Dibuka {when(election.opensAt)}</p>
			{:else if election.phase === 'open'}
				<p>Ditutup {when(election.closesAt)}</p>
			{:else if election.phase === 'closed'}
				<p>Ditutup {when(election.closesAt)}</p>
			{:else}
				<p>Panitia akan mengumumkan waktu pemungutan suara.</p>
			{/if}
		</div>
	</div>

	{#if election.phase === 'open'}
		<a class="button cta" href={resolve('/pilih')}>
			{data.userEmail ? 'Buka surat suara' : 'Masuk untuk memilih'}
			<span aria-hidden="true">→</span>
		</a>
	{/if}
</section>

<section class="band" aria-labelledby="cara">
	<div class="container">
		<h2 id="cara">Cara memilih</h2>
		<ol class="steps">
			{#each steps as step, i (step.title)}
				<li>
					<span class="step-no" aria-hidden="true">{i + 1}</span>
					<h3>{step.title}</h3>
					<p>{step.body}</p>
				</li>
			{/each}
		</ol>
	</div>
</section>

<section class="container candidates" aria-labelledby="calon">
	<h2 id="calon">Calon ketua</h2>
	{#if data.candidates.length === 0}
		<p class="muted">Daftar calon akan diumumkan oleh panitia.</p>
	{:else}
		<ul>
			{#each data.candidates as c (c.number)}
				<li><span class="cand-no">{c.number}</span>{c.name}</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.hero {
		padding-block: 56px 72px;
	}

	.hero h1 {
		max-width: 14ch;
		margin-top: 18px;
		font-size: clamp(40px, 7vw, 72px);
	}

	.lead {
		max-width: 52ch;
		margin-top: 20px;
		font-size: 17px;
		color: var(--ink-soft);
	}

	.status {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		max-width: 520px;
		margin-top: 36px;
		padding: 18px 20px;
		background: var(--paper-light);
		border: 1px solid var(--line);
		font-size: 14px;
		color: var(--ink-soft);
	}

	.cta {
		margin-top: 24px;
	}

	.status-dot {
		flex: none;
		width: 10px;
		height: 10px;
		margin-top: 6px;
		border-radius: 50%;
		background: var(--line);
	}

	[data-phase='upcoming'] .status-dot {
		background: var(--gold);
	}

	[data-phase='open'] .status-dot {
		background: var(--brown);
		box-shadow: 0 0 0 4px var(--gold-light);
	}

	.status-label {
		font-weight: 700;
		color: var(--ink);
	}

	.band {
		padding-block: 72px;
		background: var(--sand);
	}

	h2 {
		font-size: clamp(30px, 4vw, 44px);
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 32px;
		margin: 36px 0 0;
		padding: 0;
		list-style: none;
	}

	.step-no {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		margin-bottom: 14px;
		border-radius: 50%;
		background: var(--brown);
		color: var(--paper);
		font: 600 17px var(--font-display);
	}

	.steps h3 {
		font-size: 22px;
	}

	.steps p {
		margin-top: 8px;
		font-size: 15px;
		color: var(--ink-soft);
	}

	.candidates {
		padding-block: 72px;
	}

	.candidates ul {
		margin: 28px 0 0;
		padding: 0;
		list-style: none;
	}

	.candidates li {
		display: flex;
		align-items: center;
		gap: 16px;
		padding-block: 14px;
		border-bottom: 1px solid var(--line);
		font: 600 22px var(--font-display);
	}

	.cand-no {
		color: var(--gold-dark);
	}

	.muted {
		margin-top: 16px;
		color: var(--ink-muted);
	}
</style>
