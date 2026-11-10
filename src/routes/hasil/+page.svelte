<script lang="ts">
	import { resolve } from '$app/paths';
	import { normalizeReceiptCode } from '#lib/receipt-code.js';
	import { formatWib } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let p = $derived(data.participation);
	let results = $derived(data.results);
	let total = $derived(results ? results.tally.reduce((sum, row) => sum + row.votes, 0) : 0);
	let maxVotes = $derived(results ? Math.max(1, ...results.tally.map((r) => r.votes)) : 1);

	let codeInput = $state('');
	let lookupCode = $derived(normalizeReceiptCode(codeInput));
	let found = $derived(
		results && lookupCode.length === 11
			? (results.ballots.find((b) => b.code === lookupCode) ?? null)
			: undefined
	);

	const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 1000) / 10}%` : '0%');
</script>

<svelte:head>
	<title>Hasil · Pemira PMK ITERA 2027</title>
</svelte:head>

<section class="container page">
	<p class="eyebrow">Hasil pemilihan</p>
	<h1>{data.election.title}</h1>

	<p class="lead">
		{p.voted} dari {p.eligible} pemilih ({pct(p.voted, p.eligible)}) telah memberikan suara.
	</p>

	{#if !results}
		<div class="panel">
			<p>
				Hasil dan daftar surat suara akan dibuka di halaman ini setelah pemungutan suara ditutup{data
					.election.closesAt
					? ` (${formatWib(data.election.closesAt)})`
					: ''}.
			</p>
			<p class="muted">
				Kembali ke <a href={resolve('/')}>beranda</a>.
			</p>
		</div>
	{:else}
		<h2>Perolehan suara</h2>
		<ol class="tally">
			{#each results.tally as row (row.number)}
				<li>
					<div class="tally-head">
						<span class="tally-name"><span class="no">{row.number}</span>{row.name}</span>
						<span class="tally-votes"
							>{row.votes} suara <span class="muted">({pct(row.votes, total)})</span></span
						>
					</div>
					<div class="bar" aria-hidden="true">
						<span style:width="{(row.votes / maxVotes) * 100}%"></span>
					</div>
				</li>
			{/each}
		</ol>
		<p class="check" class:bad={p.voted !== results.ballots.length}>
			{#if p.voted === results.ballots.length}
				✓ Jumlah surat suara ({results.ballots.length}) sama dengan jumlah pemilih yang tercatat
				sudah memilih ({p.voted}).
			{:else}
				⚠ Jumlah surat suara ({results.ballots.length}) berbeda dengan jumlah pemilih yang tercatat
				sudah memilih ({p.voted}).
			{/if}
		</p>

		<h2>Periksa suaramu</h2>
		<div class="panel">
			<label class="lookup">
				Kode tanda terima
				<input
					bind:value={codeInput}
					placeholder="XXXXX-XXXXX"
					autocomplete="off"
					spellcheck="false"
					maxlength="16"
				/>
			</label>
			{#if found}
				<p class="lookup-result ok">
					Kode <strong>{found.code}</strong> tercatat untuk calon
					<strong>No. {found.number}</strong>.
				</p>
			{:else if found === null}
				<p class="lookup-result bad">
					Kode <strong>{lookupCode}</strong> tidak ditemukan. Periksa kembali penulisannya; jika tetap
					tidak ada, laporkan ke panitia dan saksi.
				</p>
			{/if}
		</div>

		<h2>Audit</h2>
		<div class="panel">
			<p>
				Semua {results.ballots.length} surat suara (kode → nomor calon) dapat diunduh dan dihitung ulang
				oleh siapa saja.
			</p>
			<a class="button" href={resolve('/hasil/surat-suara.csv')} download
				>Unduh daftar surat suara (CSV)</a
			>
			<p class="muted">SHA-256 berkas:</p>
			<p class="mono">{results.sha256}</p>
			<p class="muted">
				Periksa keaslian berkas dengan <code
					>shasum -a 256 surat-suara-pemira-pmk-itera-2027.csv</code
				>
				(macOS/Linux) atau <code>certutil -hashfile &lt;berkas&gt; SHA256</code> (Windows).
			</p>
		</div>
	{/if}
</section>

<style>
	.page {
		padding-block: 56px 96px;
	}

	.page > :global(*) {
		max-width: 760px;
	}

	h1 {
		margin-top: 16px;
		font-size: clamp(32px, 5vw, 50px);
	}

	h2 {
		margin-top: 44px;
		font-size: 28px;
	}

	.lead {
		margin-top: 16px;
		font-size: 17px;
		color: var(--ink-soft);
	}

	.panel {
		display: grid;
		gap: 12px;
		justify-items: start;
		margin-top: 18px;
		padding: 20px;
		background: var(--paper-light);
		border: 1px solid var(--line);
	}

	.panel a:not(.button) {
		color: var(--brown);
		font-weight: 700;
	}

	.muted {
		font-size: 14px;
		color: var(--ink-muted);
	}

	.mono {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 13px;
		word-break: break-all;
	}

	.tally {
		display: grid;
		gap: 18px;
		margin: 20px 0 0;
		padding: 0;
		list-style: none;
	}

	.tally-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 4px 16px;
		margin-bottom: 8px;
	}

	.tally-name {
		font: 600 22px var(--font-display);
	}

	.no {
		margin-right: 12px;
		color: var(--gold-dark);
	}

	.tally-votes {
		font-weight: 700;
	}

	.bar {
		height: 12px;
		background: var(--sand);
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--brown);
	}

	.check {
		margin-top: 20px;
		font-size: 14px;
		color: #34470f;
	}

	.check.bad {
		color: #8f2f1c;
		font-weight: 700;
	}

	.lookup {
		display: grid;
		gap: 6px;
		font-weight: 700;
		font-size: 14px;
	}

	.lookup input {
		width: min(260px, 100%);
		padding: 10px 12px;
		border: 1px solid var(--line);
		background: #fff;
		font:
			700 20px ui-monospace,
			'SF Mono',
			Menlo,
			monospace;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.lookup-result {
		padding: 10px 12px;
		border-left: 3px solid;
		font-size: 15px;
	}

	.lookup-result.ok {
		background: #eaf0dc;
		border-color: #5b7a2a;
	}

	.lookup-result.bad {
		background: #f7e6dc;
		border-color: #a3402a;
	}
</style>
