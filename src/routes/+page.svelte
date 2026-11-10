<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatWib as when } from '#lib/time.js';
	import BallotHead from '#lib/components/BallotHead.svelte';
	import Countdown from '#lib/components/Countdown.svelte';
	import Guilloche from '#lib/components/Guilloche.svelte';
	import PhaseStamp from '#lib/components/PhaseStamp.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let election = $derived(data.election);
	let p = $derived(data.participation);
	let turnout = $derived(p.eligible ? Math.round((p.voted / p.eligible) * 1000) / 10 : 0);

	const steps = [
		{
			title: 'Masuk dengan email ITERA',
			body: 'Gunakan akun Google nama.nim@student.itera.ac.id. NIM-mu harus terdaftar di DPT.'
		},
		{
			title: 'Coblos satu calon',
			body: 'Baca visi dan misi, pilih satu calon, lalu konfirmasi pilihanmu.'
		},
		{
			title: 'Simpan kode tanda terima',
			body: 'Kode acak ini hanya kamu yang tahu. Tidak wajib dipakai, hanya berguna jika nanti ada sengketa hasil.'
		}
	];

	const guarantees = [
		{
			title: 'Pilihanmu rahasia',
			body: 'Surat suara disimpan tanpa nama, NIM, atau waktu memilih. Panitia pun tidak bisa melihat dari web siapa yang sudah atau belum memilih, hanya jumlahnya.'
		},
		{
			title: 'Satu NIM, satu suara',
			body: 'Aturan ini dijaga langsung oleh database: suara tidak bisa dikirim dua kali dan tidak bisa diubah.'
		},
		{
			title: 'Bisa diperiksa siapa saja',
			body: 'Setelah ditutup, semua surat suara diumumkan dengan kode acak. Kamu tidak wajib memeriksanya; jika ada sengketa, siapa pun bisa mencocokkan kode atau menghitung ulang sendiri.'
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

<section class="hero" aria-labelledby="judul">
	<div class="hero-watermark" aria-hidden="true">
		<Guilloche strands={18} waves={7} inner={30} outer={98} strokeWidth={0.35} />
	</div>

	<div class="container hero-grid">
		<div class="hero-copy">
			<p class="eyebrow rise">Pemilihan Raya · PMK ITERA</p>
			<h1 id="judul" class="rise" style:--i="1">{election.title}</h1>
			<p class="lead rise" style:--i="2">
				Satu suara dari setiap anggota untuk menentukan arah pelayanan. Rahasia, tercatat sekali,
				dan bisa <em>diperiksa siapa saja.</em>
			</p>

			<div class="status rise" style:--i="3" data-phase={election.phase}>
				{#if election.phase === 'upcoming' && election.opensAt !== null}
					<p class="status-line">
						Pemungutan suara dibuka <strong>{when(election.opensAt)}</strong>
					</p>
					<Countdown target={election.opensAt} label="Waktu menuju pemungutan suara dibuka" />
				{:else if election.phase === 'open' && election.closesAt !== null}
					<p class="status-line">
						<span class="live" aria-hidden="true"></span>
						Pemungutan suara sedang berlangsung, ditutup
						<strong>{when(election.closesAt)}</strong>
					</p>
					<Countdown target={election.closesAt} label="Sisa waktu pemungutan suara" />
				{:else if election.phase === 'closed'}
					<p class="status-line">
						Pemungutan suara ditutup <strong>{when(election.closesAt)}</strong>
					</p>
				{:else}
					<p class="status-line">Panitia akan mengumumkan waktu pemungutan suara.</p>
				{/if}

				{#if election.phase === 'open' || election.phase === 'closed'}
					<div class="turnout">
						<div class="turnout-head">
							<span>Partisipasi</span>
							<span
								><strong class="mono">{p.voted}</strong> dari
								<span class="mono">{p.eligible}</span> pemilih</span
							>
						</div>
						<div
							class="meter"
							role="meter"
							aria-label="Partisipasi pemilih"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={turnout}
							aria-valuetext="{turnout}%"
						>
							<span style:width="{turnout}%"></span>
						</div>
					</div>
				{/if}
			</div>

			<div class="cta-row rise" style:--i="4">
				{#if election.phase === 'open'}
					<a class="button" href={resolve('/pilih')}>
						{data.userEmail ? 'Buka surat suara' : 'Masuk untuk memilih'}
						<span class="arrow" aria-hidden="true">→</span>
					</a>
				{:else if election.phase === 'closed'}
					<a class="button" href={resolve('/hasil')}>
						Lihat hasil dan periksa suaramu <span class="arrow" aria-hidden="true">→</span>
					</a>
				{/if}
				<a class="text-link" href="#cara">Cara memilih</a>
			</div>
		</div>

		<div class="hero-ballot">
			<article class="sheet folded ballot" aria-labelledby="calon">
				<BallotHead title={election.title} hint="Coblos satu kotak · Rahasia" />
				<h2 id="calon" class="visually-hidden">Calon ketua</h2>
				{#if data.candidates.length === 0}
					<div class="empty">
						<p>Daftar calon akan diumumkan oleh panitia.</p>
					</div>
				{:else}
					<ul class="slots" class:many={data.candidates.length > 2}>
						{#each data.candidates as c (c.number)}
							<li>
								<span class="slot-no">{c.number}</span>
								{#if c.photo}<img class="slot-photo" src={c.photo} alt="" />{/if}
								<span class="slot-name">{c.name}</span>
							</li>
						{/each}
					</ul>
				{/if}
				<p class="ballot-foot">
					<span>Calon ketua PMK ITERA</span>
				</p>
			</article>
			<div class="ballot-stamp">
				<PhaseStamp phase={election.phase} />
			</div>
		</div>
	</div>
</section>

<section class="steps-band" id="cara" aria-labelledby="cara-judul">
	<div class="container">
		<div class="band-head">
			<p class="eyebrow">Tiga langkah</p>
			<h2 id="cara-judul">Cara <em>memilih</em></h2>
		</div>
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

<section class="container trust" aria-labelledby="jaminan">
	<div class="trust-head">
		<p class="eyebrow">Jaminan</p>
		<h2 id="jaminan">Rahasia, sekali, dan <em>terbuka.</em></h2>
		<p>
			Seluruh aturan pemilihan tertulis di kode sumber yang terbuka. Siapa pun boleh membacanya dan
			mengujinya.
		</p>
	</div>
	<ul class="guarantees">
		{#each guarantees as g (g.title)}
			<li>
				<h3>{g.title}</h3>
				<p>{g.body}</p>
			</li>
		{/each}
	</ul>
</section>

<style>
	/* Hero */
	.hero {
		position: relative;
		overflow: hidden;
		padding-block: clamp(40px, 7vw, 88px) clamp(56px, 8vw, 104px);
	}

	.hero-watermark {
		position: absolute;
		top: -12%;
		right: -18%;
		width: min(900px, 110vw);
		color: var(--gold);
		opacity: 0.22;
		pointer-events: none;
	}

	.hero-grid {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		align-items: center;
		gap: clamp(40px, 6vw, 88px);
	}

	h1 {
		margin-top: 20px;
		font-size: clamp(44px, 6.6vw, 84px);
		font-weight: 450;
		line-height: 0.98;
		letter-spacing: -0.035em;
	}

	.lead {
		max-width: 46ch;
		margin-top: 24px;
		font-size: clamp(17px, 1.6vw, 19px);
		color: var(--ink-soft);
	}

	.lead em {
		font: italic 500 1.12em var(--font-display);
		color: var(--brown);
	}

	.status {
		display: grid;
		gap: 14px;
		max-width: 480px;
		margin-top: 32px;
		padding: 18px;
		border-radius: var(--radius);
		background: var(--paper-light);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 1px rgb(215 201 179 / 0.8);
	}

	.status-line {
		font-size: 15px;
		color: var(--ink-soft);
	}

	.status-line strong {
		color: var(--ink);
	}

	.live {
		display: inline-block;
		width: 9px;
		height: 9px;
		margin-right: 6px;
		border-radius: 50%;
		background: var(--gold);
		vertical-align: 1px;
		box-shadow: 0 0 0 0 rgb(197 154 39 / 0.6);
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		70% {
			box-shadow: 0 0 0 8px rgb(197 154 39 / 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgb(197 154 39 / 0);
		}
	}

	.turnout {
		display: grid;
		gap: 8px;
		padding-top: 4px;
	}

	.turnout-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 4px 12px;
		font-size: 13px;
		color: var(--ink-muted);
	}

	.turnout-head > span:first-child {
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 11px;
	}

	.meter {
		height: 10px;
		border-radius: 999px;
		background: var(--sand);
		overflow: hidden;
	}

	.meter span {
		display: block;
		height: 100%;
		min-width: 4px;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--brown), var(--gold));
		animation: grow 1.2s 0.5s var(--ease-out) both;
		transform-origin: left;
	}

	@keyframes grow {
		from {
			transform: scaleX(0);
		}
	}

	.cta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 24px;
		margin-top: 28px;
	}

	.text-link {
		font-weight: 800;
		font-size: 15px;
		color: var(--brown);
		text-decoration-color: var(--gold);
		text-decoration-thickness: 2px;
		text-underline-offset: 5px;
	}

	/* Surat suara di hero */
	.hero-ballot {
		position: relative;
		animation: drop 0.9s 0.2s var(--ease-out) both;
	}

	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(30px) rotate(0deg);
		}
	}

	.ballot {
		transform: rotate(1.6deg);
	}

	.slots {
		position: relative;
		z-index: 4; /* di atas bekas lipatan kertas, supaya garisnya tidak memotong foto */
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin: 0;
		padding: 20px 24px 8px;
		list-style: none;
		gap: 14px;
	}

	.slots li {
		display: grid;
		align-content: space-between;
		gap: 20px;
		min-height: 180px;
		padding: 16px;
		border: 1.5px solid var(--brown);
		border-radius: 4px;
		background: #fffdf8;
	}

	.slots.many li {
		min-height: 130px;
	}

	.slot-photo {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		object-position: top;
		border-radius: 3px;
		box-shadow: 0 0 0 1px rgb(68 46 22 / 0.2);
	}

	.slot-no {
		font: italic 400 64px/0.85 var(--font-display);
		color: var(--gold-dark);
	}

	.slot-name {
		font: 500 20px/1.15 var(--font-display);
	}

	.empty {
		display: grid;
		place-items: center;
		min-height: 220px;
		margin: 20px 24px 8px;
		padding: 20px;
		border: 1.5px dashed var(--line);
		border-radius: 4px;
		text-align: center;
		color: var(--ink-muted);
	}

	.ballot-foot {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 24px 18px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.ballot-stamp {
		position: absolute;
		z-index: 4;
		right: -14px;
		bottom: -22px;
		animation: stamp 0.5s 1s cubic-bezier(0.3, 1.5, 0.5, 1) both;
	}

	@keyframes stamp {
		from {
			opacity: 0;
			transform: scale(1.6);
		}
	}

	/* Cara memilih */
	.steps-band {
		position: relative;
		padding-block: clamp(64px, 9vw, 112px);
		background: var(--brown-dark);
		color: var(--paper-light);
	}

	.band-head .eyebrow {
		color: var(--gold);
	}

	.steps-band h2,
	.trust h2 {
		margin-top: 14px;
		font-size: clamp(36px, 5vw, 60px);
		font-weight: 450;
	}

	.steps-band h2 em {
		color: var(--gold);
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 40px;
		margin: 56px 0 0;
		padding: 0;
		list-style: none;
		counter-reset: step;
	}

	.steps li {
		position: relative;
	}

	/* Garis putus-putus yang menyambung langkah */
	.steps li:not(:last-child)::after {
		content: '';
		position: absolute;
		top: 44px;
		left: 76px;
		right: -28px;
		border-top: 1.5px dashed rgb(229 210 154 / 0.4);
	}

	.step-no {
		display: block;
		font: italic 300 96px/0.9 var(--font-display);
		color: var(--gold);
	}

	.steps h3 {
		margin-top: 20px;
		font-size: 26px;
		font-weight: 500;
	}

	.steps p {
		margin-top: 10px;
		max-width: 34ch;
		font-size: 15px;
		color: var(--sand);
	}

	/* Jaminan */
	.trust {
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		gap: 48px clamp(40px, 6vw, 96px);
		padding-block: clamp(64px, 9vw, 112px) 24px;
	}

	.trust-head > p:last-child {
		max-width: 40ch;
		margin-top: 18px;
		color: var(--ink-soft);
	}

	.guarantees {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.guarantees li {
		display: grid;
		grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
		gap: 8px 32px;
		padding-block: 24px;
		border-top: 1px solid var(--line);
	}

	.guarantees li:last-child {
		border-bottom: 1px solid var(--line);
	}

	.guarantees h3 {
		font-size: 24px;
		font-weight: 500;
	}

	.guarantees p {
		font-size: 15px;
		color: var(--ink-soft);
	}

	@media (max-width: 900px) {
		.hero-grid,
		.trust {
			grid-template-columns: 1fr;
		}

		.hero-ballot {
			max-width: 520px;
		}

		.steps {
			grid-template-columns: 1fr;
			gap: 36px;
		}

		.steps li {
			display: grid;
			grid-template-columns: 64px 1fr;
			column-gap: 16px;
		}

		.steps li > :not(.step-no) {
			grid-column: 2;
		}

		.step-no {
			grid-row: span 2;
			font-size: 64px;
		}

		.steps h3 {
			margin-top: 4px;
		}

		.steps li:not(:last-child)::after {
			display: none;
		}
	}

	@media (max-width: 560px) {
		.ballot {
			transform: none;
		}

		.slots {
			padding-inline: 16px;
			gap: 10px;
		}

		.slots li {
			min-height: 140px;
		}

		.slot-no {
			font-size: 48px;
		}

		.slot-name {
			font-size: 17px;
		}

		.ballot-stamp {
			right: 8px;
		}

		.guarantees li {
			grid-template-columns: 1fr;
		}
	}
</style>
