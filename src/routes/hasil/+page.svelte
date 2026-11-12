<script lang="ts">
	import { resolve } from '$app/paths';
	import { normalizeReceiptCode } from '#lib/receipt-code.js';
	import { formatWib } from '#lib/time.js';
	import Countdown from '#lib/components/Countdown.svelte';
	import Guilloche from '#lib/components/Guilloche.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let p = $derived(data.participation);
	let results = $derived(data.results);
	let total = $derived(results ? results.tally.reduce((sum, row) => sum + row.votes, 0) : 0);
	let maxVotes = $derived(results ? Math.max(1, ...results.tally.map((r) => r.votes)) : 1);

	let codeInput = $state('');
	let lookupCode = $derived(normalizeReceiptCode(codeInput));
	let audit = $derived(results?.audit ?? null);
	let found = $derived(
		audit && lookupCode.length === 11
			? (audit.ballots.find((b) => b.code === lookupCode) ?? null)
			: undefined
	);

	let turnout = $derived(p.eligible ? (p.voted / p.eligible) * 100 : 0);

	const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 1000) / 10}%` : '0%');
</script>

<svelte:head>
	<title>Hasil · Pemira PMK ITERA 2027</title>
</svelte:head>

<section class="container page">
	<header class="page-head rise">
		<p class="eyebrow">Hasil pemilihan</p>
		<h1>{data.election.title}</h1>
	</header>

	<dl class="facts rise" style:--i="1">
		<div>
			<dt>Sudah memilih</dt>
			<dd class="mono">{p.voted}</dd>
		</div>
		<div>
			<dt>Pemilih terdaftar</dt>
			<dd class="mono">{p.eligible}</dd>
		</div>
		<div>
			<dt>Partisipasi</dt>
			<dd class="mono">{pct(p.voted, p.eligible)}</dd>
		</div>
		<div class="facts-meter" aria-hidden="true">
			<span style:width="{turnout}%"></span>
		</div>
	</dl>

	{#if !results}
		<div class="sealed rise" style:--i="2">
			<div class="sealed-mark" aria-hidden="true">
				<Guilloche strands={14} waves={8} inner={44} outer={98} strokeWidth={0.8} />
			</div>
			<div class="sealed-body">
				<h2>Kotak suara masih <em>tersegel.</em></h2>
				{#if data.awaitingPublish}
					<p>
						Pemungutan suara sudah ditutup{data.election.closesAt
							? ` (${formatWib(data.election.closesAt)})`
							: ''}. Hasil akan dibuka di halaman ini setelah dipublikasikan panitia. Sampai saat
						itu perolehan suara tidak ditampilkan kepada siapa pun, termasuk panitia.
					</p>
				{:else}
					<p>
						Hasil dan daftar surat suara akan dibuka di halaman ini setelah pemungutan suara ditutup{data
							.election.closesAt
							? ` (${formatWib(data.election.closesAt)})`
							: ''}.
					</p>
				{/if}
				{#if data.election.phase === 'open' && data.election.closesAt !== null}
					<div class="sealed-countdown">
						<Countdown target={data.election.closesAt} label="Sisa waktu pemungutan suara" />
					</div>
				{/if}
				<a class="text-link" href={resolve('/')}>Kembali ke beranda</a>
			</div>
		</div>
	{:else}
		<section class="block" aria-labelledby="perolehan">
			<h2 id="perolehan">Perolehan <em>suara</em></h2>
			<ol class="tally">
				{#each results.tally as row, i (row.number)}
					{@const top = row.votes > 0 && row.votes === maxVotes}
					<li class:top style:--i={i}>
						<span class="no" aria-hidden="true">{row.number}</span>
						<div class="tally-main">
							<p class="tally-name">
								{#if results.photoByNumber[row.number]}
									<img class="avatar" src={results.photoByNumber[row.number]} alt="" />
								{/if}
								<span class="visually-hidden">Nomor {row.number}, </span>{row.name}
								{#if top}<span class="badge">Suara terbanyak</span>{/if}
							</p>
							<div class="bar" aria-hidden="true">
								<span style:width="{(row.votes / maxVotes) * 100}%"></span>
							</div>
						</div>
						<p class="tally-votes">
							<span class="pct">{pct(row.votes, total)}</span>
							<span class="count mono">{row.votes} suara</span>
						</p>
					</li>
				{/each}
			</ol>
			<p class="check" class:bad={p.voted !== p.ballots}>
				{#if p.voted === p.ballots}
					<span class="check-icon" aria-hidden="true">✓</span>
					Jumlah surat suara ({p.ballots}) sama dengan jumlah pemilih yang tercatat sudah memilih ({p.voted}).
				{:else}
					<span class="check-icon" aria-hidden="true">!</span>
					Jumlah surat suara ({p.ballots}) berbeda dengan jumlah pemilih yang tercatat sudah memilih
					({p.voted}).
				{/if}
			</p>
		</section>

		{#if audit}
			<div class="split">
				<section class="lookup-card" aria-labelledby="periksa">
					<h2 id="periksa">Periksa <em>suaramu</em></h2>
					<p class="muted">
						Tidak wajib. Ketik kode tanda terima yang kamu simpan jika ingin memastikan suaramu
						tercatat, misalnya saat ada sengketa.
					</p>
					<label class="lookup">
						<span>Kode tanda terima</span>
						<input
							bind:value={codeInput}
							placeholder="XXXXX-XXXXX"
							autocomplete="off"
							spellcheck="false"
							maxlength="16"
						/>
					</label>
					{#if found}
						<p class="msg msg-ok">
							Kode <strong class="mono">{found.code}</strong> tercatat untuk calon
							<strong>No. {found.number}</strong>.
						</p>
					{:else if found === null}
						<p class="msg msg-error">
							<span>
								Kode <strong class="mono">{lookupCode}</strong> tidak ditemukan. Periksa kembali penulisannya;
								jika tetap tidak ada, laporkan ke panitia dan saksi.
							</span>
						</p>
					{/if}
				</section>

				<section class="audit" aria-labelledby="audit">
					<h2 id="audit">Audit <em>mandiri</em></h2>
					<p>
						Semua {audit.ballots.length} surat suara (kode → nomor calon) dapat diunduh dan dihitung ulang
						oleh siapa saja.
					</p>
					<a class="button button-gold" href={resolve('/hasil/surat-suara.csv')} download>
						Unduh daftar surat suara (CSV)
					</a>
					<p class="hash-label">SHA-256 berkas</p>
					<p class="hash mono">{audit.sha256}</p>
					<p class="audit-help">
						Periksa keaslian berkas dengan <code
							>shasum -a 256 surat-suara-pemira-pmk-itera-2027.csv</code
						>
						(macOS/Linux) atau <code>certutil -hashfile &lt;berkas&gt; SHA256</code> (Windows).
					</p>
				</section>
			</div>
		{/if}

		<section class="block exceptions" aria-labelledby="pengecualian">
			<h2 id="pengecualian">Masuk tanpa <em>Google</em></h2>
			{#if results.exceptionNims.length === 0}
				<p class="muted">
					Tidak ada pemilih yang masuk dengan kode pengecualian. Semua pemilih masuk dengan akun
					Google mahasiswanya sendiri.
				</p>
			{:else}
				<p class="muted">
					NIM berikut tidak bisa masuk dengan Google, sehingga masuk dengan kode sekali pakai yang
					disetujui dua admin atau dibuat super admin di TPS. Pilihannya tetap rahasia. Jika NIM-mu
					ada di sini padahal kamu tidak pernah memakai jalur ini, laporkan ke panitia dan saksi.
				</p>
				<ul class="nim-list">
					{#each results.exceptionNims as nim (nim)}
						<li class="mono">{nim}</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</section>

<style>
	.page {
		padding-block: clamp(32px, 6vw, 72px) 32px;
	}

	h1 {
		margin-top: 16px;
		max-width: 18ch;
		font-size: clamp(38px, 5.6vw, 64px);
		font-weight: 450;
	}

	h2 {
		font-size: clamp(28px, 3.4vw, 38px);
		font-weight: 450;
	}

	.muted {
		margin-top: 8px;
		font-size: 15px;
		color: var(--ink-muted);
	}

	.text-link {
		font-weight: 800;
		color: var(--brown);
		text-decoration-color: var(--gold);
		text-decoration-thickness: 2px;
		text-underline-offset: 5px;
	}

	/* Angka partisipasi */
	.facts {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 36px 0 0;
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--paper-light);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 1px rgb(215 201 179 / 0.8);
	}

	.facts > div:not(.facts-meter) {
		padding: 20px 24px 18px;
	}

	.facts > div + div:not(.facts-meter) {
		border-left: 1px solid var(--line);
	}

	dt {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	dd {
		margin: 6px 0 0;
		font-size: clamp(26px, 4vw, 40px);
		font-weight: 600;
		line-height: 1;
		color: var(--brown-dark);
	}

	.facts-meter {
		grid-column: 1 / -1;
		height: 6px;
		background: var(--sand);
	}

	.facts-meter span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--brown), var(--gold));
	}

	/* Belum ditutup */
	.sealed {
		position: relative;
		display: grid;
		grid-template-columns: 180px 1fr;
		align-items: center;
		gap: 32px;
		margin-top: 32px;
		padding: clamp(24px, 4vw, 40px);
		border: 1.5px dashed var(--line);
		border-radius: var(--radius);
	}

	.sealed-mark {
		color: var(--gold);
	}

	.sealed-body {
		display: grid;
		justify-items: start;
		gap: 14px;
	}

	.sealed-body p {
		max-width: 54ch;
		color: var(--ink-soft);
	}

	.sealed-countdown {
		width: min(100%, 420px);
	}

	/* Perolehan */
	.block {
		margin-top: 56px;
	}

	.tally {
		display: grid;
		gap: 12px;
		margin: 24px 0 0;
		padding: 0;
		list-style: none;
	}

	.tally li {
		display: grid;
		grid-template-columns: 72px minmax(0, 1fr) auto;
		align-items: center;
		gap: 20px;
		padding: 18px 24px 18px 20px;
		border-radius: var(--radius);
		background: var(--paper-light);
		box-shadow: inset 0 0 0 1px rgb(215 201 179 / 0.8);
		animation: rise 0.7s var(--ease-out) both;
		animation-delay: calc(var(--i) * 100ms + 150ms);
	}

	.tally li.top {
		background: #fffdf8;
		box-shadow:
			inset 0 0 0 1.5px var(--brown),
			var(--shadow-soft);
	}

	.no {
		font: italic 400 64px/0.85 var(--font-display);
		color: var(--gold-dark);
		text-align: center;
	}

	.tally-main {
		display: grid;
		gap: 10px;
	}

	.tally-name {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 12px;
		font: 500 24px/1.2 var(--font-display);
	}

	.avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
		object-position: top;
		box-shadow:
			0 0 0 2px var(--paper-light),
			0 0 0 3.5px var(--gold);
	}

	.badge {
		padding: 3px 10px;
		border-radius: 999px;
		background: var(--brown);
		color: var(--gold-light);
		font: 800 11px var(--font-body);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.bar {
		height: 12px;
		border-radius: 999px;
		background: var(--sand);
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--gold);
		transform-origin: left;
		animation: grow 1.1s 0.4s var(--ease-out) both;
	}

	.top .bar span {
		background: linear-gradient(90deg, var(--brown-dark), var(--brown));
	}

	@keyframes grow {
		from {
			transform: scaleX(0);
		}
	}

	.tally-votes {
		display: grid;
		justify-items: end;
		text-align: right;
	}

	.pct {
		font: 500 34px/1 var(--font-display);
		color: var(--ink);
	}

	.count {
		margin-top: 4px;
		font-size: 13px;
		color: var(--ink-muted);
	}

	.check {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 18px;
		font-size: 14px;
		color: var(--ok);
	}

	.check-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--ok-bg);
		box-shadow: inset 0 0 0 1px var(--ok-line);
		font-size: 12px;
		font-weight: 800;
	}

	.check.bad {
		color: var(--danger);
		font-weight: 700;
	}

	.check.bad .check-icon {
		background: var(--danger-bg);
		box-shadow: inset 0 0 0 1px var(--danger-line);
	}

	/* Periksa dan audit */
	.split {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-items: start;
		gap: 20px;
		margin-top: 56px;
	}

	.lookup-card,
	.exceptions {
		max-width: 760px;
	}

	.exceptions .muted {
		margin-top: 12px;
	}

	.nim-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.nim-list li {
		padding: 4px 12px;
		border-radius: 999px;
		background: var(--paper-light);
		box-shadow: inset 0 0 0 1px var(--line);
		font-size: 14px;
	}

	.audit {
		display: grid;
		align-content: start;
		justify-items: start;
		gap: 14px;
		padding: clamp(22px, 3.5vw, 36px);
		border-radius: var(--radius);
	}

	.lookup-card {
		background: var(--paper-light);
		box-shadow:
			var(--shadow-soft),
			inset 0 0 0 1px rgb(215 201 179 / 0.8);
	}

	.lookup {
		display: grid;
		gap: 8px;
		width: 100%;
		margin-top: 6px;
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.lookup input {
		width: 100%;
		padding: 14px 16px;
		border: 1.5px solid var(--line);
		border-radius: var(--radius-sm);
		background: #fff;
		font: 600 clamp(20px, 3vw, 26px) var(--font-mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.lookup input::placeholder {
		color: var(--line);
	}

	.lookup input:focus {
		outline: none;
		border-color: var(--gold);
		box-shadow: 0 0 0 4px rgb(197 154 39 / 0.25);
	}

	.audit {
		background: var(--brown-dark);
		color: var(--sand);
	}

	.audit h2 {
		color: var(--paper-light);
	}

	.audit h2 em {
		color: var(--gold);
	}

	.hash-label {
		margin-top: 8px;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--gold);
	}

	.hash {
		width: 100%;
		margin-top: -6px;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		background: rgb(0 0 0 / 0.22);
		font-size: 13px;
		color: var(--gold-light);
		word-break: break-all;
	}

	.audit-help {
		font-size: 13px;
	}

	.audit code {
		background: rgb(255 255 255 / 0.08);
		color: var(--paper-light);
	}

	@media (max-width: 800px) {
		.split {
			grid-template-columns: 1fr;
		}

		.sealed {
			grid-template-columns: 1fr;
		}

		.sealed-mark {
			width: 96px;
		}
	}

	@media (max-width: 560px) {
		.facts > div:not(.facts-meter) {
			padding: 16px 14px 14px;
		}

		dt {
			font-size: 10px;
			letter-spacing: 0.08em;
		}

		.tally li {
			grid-template-columns: 44px minmax(0, 1fr);
			gap: 12px 14px;
			padding: 16px;
		}

		.no {
			font-size: 44px;
		}

		.tally-votes {
			grid-column: 2;
			grid-template-columns: auto auto;
			justify-content: start;
			align-items: baseline;
			gap: 10px;
		}

		.pct {
			font-size: 26px;
		}
	}
</style>
