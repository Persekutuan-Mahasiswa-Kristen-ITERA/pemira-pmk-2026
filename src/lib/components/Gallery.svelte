<!-- Galeri dokumentasi: cetakan foto per kegiatan; klik untuk memperbesar (lightbox). -->
<script lang="ts">
	import { tick } from 'svelte';
	import type { Activity } from '#lib/kegiatan.js';

	let { activities }: { activities: readonly Activity[] } = $props();

	const PREVIEW = 9;
	const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

	let activeId = $state('');
	let showAll = $state(false);
	let active = $derived(activities.find((a) => a.id === activeId) ?? activities[0]);
	let shown = $derived(showAll ? active.photos : active.photos.slice(0, PREVIEW));
	let total = $derived(activities.reduce((n, a) => n + a.photos.length, 0));

	let dialog: HTMLDialogElement | undefined = $state();
	let bigImg: HTMLImageElement | undefined = $state();
	let strip: HTMLElement | undefined = $state();
	let index = $state(0);
	let isOpen = $state(false);
	let current = $derived(active.photos[index]);

	const pad = (n: number) => String(n).padStart(2, '0');

	function reducedMotion() {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function choose(id: string) {
		activeId = id;
		showAll = false;
	}

	function thumbFor(i: number): HTMLImageElement | null {
		return document.querySelector<HTMLImageElement>(`[data-print="${active.id}-${i}"] img`);
	}

	/** Animasi "membesar dari foto": pindahkan gambar besar dari posisi cetakan kecilnya. */
	function flip(from: DOMRect, to: DOMRect, reverse: boolean) {
		if (!bigImg) return;
		const t = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
		const frames = [{ transform: t }, { transform: 'none' }];
		return bigImg.animate(reverse ? frames.reverse() : frames, {
			duration: reverse ? 280 : 460,
			easing: EASE,
			fill: reverse ? 'forwards' : 'none'
		});
	}

	async function open(i: number) {
		index = i;
		isOpen = true;
		dialog?.showModal();
		await tick();
		scrollStrip('instant');
		const thumb = thumbFor(i);
		if (!thumb || !bigImg || reducedMotion()) return;
		flip(thumb.getBoundingClientRect(), bigImg.getBoundingClientRect(), false);
	}

	async function close() {
		if (!dialog?.open) return;
		const thumb = thumbFor(index);
		if (bigImg && !reducedMotion()) {
			dialog.classList.add('closing');
			const anim =
				thumb && isVisible(thumb)
					? flip(thumb.getBoundingClientRect(), bigImg.getBoundingClientRect(), true)
					: bigImg.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.94)' }], {
							duration: 200,
							fill: 'forwards'
						});
			await anim?.finished.catch(() => {});
			bigImg.getAnimations().forEach((a) => a.cancel());
			dialog.classList.remove('closing');
		}
		dialog.close();
	}

	function isVisible(el: Element) {
		const r = el.getBoundingClientRect();
		return r.bottom > 0 && r.top < window.innerHeight;
	}

	async function go(step: number) {
		const n = active.photos.length;
		index = (index + step + n) % n;
		// Foto di luar pratinjau ikut ditampilkan, supaya animasi tutup kembali ke cetakannya.
		if (index >= PREVIEW) showAll = true;
		await tick();
		scrollStrip('smooth');
		if (bigImg && !reducedMotion()) {
			bigImg.animate(
				[
					{ opacity: 0, transform: `translateX(${Math.sign(step) * 40}px)` },
					{ opacity: 1, transform: 'none' }
				],
				{ duration: 260, easing: EASE }
			);
		}
	}

	function scrollStrip(behavior: ScrollBehavior) {
		strip
			?.querySelector('[aria-current="true"]')
			?.scrollIntoView({ behavior, block: 'nearest', inline: 'center' });
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') go(1);
		else if (e.key === 'ArrowLeft') go(-1);
	}

	// Esc: tutup dengan animasi, bukan langsung.
	function onCancel(e: Event) {
		e.preventDefault();
		close();
	}

	let swipeX: number | null = null;
	function swipeStart(e: PointerEvent) {
		if (e.pointerType !== 'mouse') swipeX = e.clientX;
	}
	function swipeEnd(e: PointerEvent) {
		if (swipeX === null) return;
		const dx = e.clientX - swipeX;
		swipeX = null;
		if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
	}

	// Muat dulu foto sebelum dan sesudahnya supaya geser terasa instan.
	$effect(() => {
		if (!isOpen) return;
		const n = active.photos.length;
		for (const step of [1, -1]) new Image().src = active.photos[(index + step + n) % n].src;
	});
</script>

<div class="gallery">
	<div class="chapters" role="group" aria-label="Pilih kegiatan">
		{#each activities as a, i (a.id)}
			<button
				type="button"
				class="chapter"
				aria-pressed={a.id === active.id}
				onclick={() => choose(a.id)}
			>
				<span class="chapter-no mono">{pad(i + 1)}</span>
				<span class="chapter-title">{a.short}</span>
				<span class="chapter-meta">{a.date} · {a.photos.length} foto</span>
			</button>
		{/each}
	</div>

	{#key active.id}
		<div class="album">
			<header class="album-head">
				<h3>{active.title}</h3>
				<p>
					{active.date} · <span class="mono">{active.photos.length}</span> foto dari
					<span class="mono">{total}</span>
				</p>
			</header>

			<ul class="prints">
				{#each shown as photo, i (photo.src)}
					<li
						style:--i={i % PREVIEW}
						style:--r="{[-1.6, 1.1, -0.6, 1.7, -1.2, 0.5, -1.9, 1.3, -0.3][i % 9]}deg"
					>
						<button
							type="button"
							class="print"
							data-print="{active.id}-{i}"
							onclick={() => open(i)}
							aria-label="Perbesar foto {i + 1} dari {active.photos.length}: {active.title}"
						>
							<img
								src={photo.thumb}
								width={photo.width}
								height={photo.height}
								alt=""
								loading="lazy"
								decoding="async"
							/>
							<span class="frame-no mono" aria-hidden="true"
								>{pad(i + 1)}/{pad(active.photos.length)}</span
							>
							<span class="zoom" aria-hidden="true">
								<svg viewBox="0 0 24 24" width="18" height="18"
									><circle cx="10.5" cy="10.5" r="6.5" /><path
										d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"
									/></svg
								>
							</span>
						</button>
					</li>
				{/each}
			</ul>

			{#if active.photos.length > PREVIEW}
				<div class="more">
					<button type="button" class="button button-ghost" onclick={() => (showAll = !showAll)}>
						{showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua ${active.photos.length} foto`}
					</button>
				</div>
			{/if}
		</div>
	{/key}
</div>

<dialog
	bind:this={dialog}
	class="lightbox"
	aria-label="Foto {index + 1} dari {active.photos.length}: {active.title}"
	onkeydown={onKey}
	oncancel={onCancel}
	onclose={() => (isOpen = false)}
>
	{#if isOpen && current}
		<div class="lb-top">
			<p class="lb-caption">
				<strong>{active.title}</strong>
				<span>{active.date}</span>
			</p>
			<p class="lb-count mono">{pad(index + 1)} / {pad(active.photos.length)}</p>
			<button type="button" class="lb-close" onclick={close} aria-label="Tutup">
				<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6 6 18" /></svg>
			</button>
		</div>

		<!-- Klik di luar foto menutup; keyboard memakai Esc dan tombol panah (lihat onKey). -->
		<div
			class="lb-stage"
			role="presentation"
			onclick={(e) => e.target === e.currentTarget && close()}
			onpointerdown={swipeStart}
			onpointerup={swipeEnd}
		>
			<button type="button" class="lb-nav prev" onclick={() => go(-1)} aria-label="Foto sebelumnya">
				<svg viewBox="0 0 24 24" width="26" height="26"><path d="M15 5l-7 7 7 7" /></svg>
			</button>
			<img
				bind:this={bigImg}
				class="lb-img"
				src={current.src}
				width={current.width}
				height={current.height}
				alt="{active.title}, foto {index + 1}"
				style:aspect-ratio="{current.width} / {current.height}"
				style:width="min(100%, calc((100dvh - var(--lb-chrome)) * {current.width /
					current.height}))"
				style:background-image="url({current.thumb})"
			/>
			<button type="button" class="lb-nav next" onclick={() => go(1)} aria-label="Foto berikutnya">
				<svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 5l7 7-7 7" /></svg>
			</button>
		</div>

		<div class="lb-strip" bind:this={strip}>
			{#each active.photos as photo, i (photo.src)}
				<button
					type="button"
					aria-current={i === index ? 'true' : undefined}
					aria-label="Foto {i + 1}"
					onclick={() => go(i - index)}
				>
					<img src={photo.thumb} alt="" loading="lazy" />
				</button>
			{/each}
		</div>
	{/if}
</dialog>

<style>
	/* Pilihan kegiatan: seperti indeks bab */
	.chapters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 10px;
	}

	.chapter {
		display: grid;
		gap: 2px;
		padding: 14px 16px 14px;
		border: 0;
		border-radius: var(--radius-sm);
		background: rgb(247 243 234 / 0.55);
		box-shadow: inset 0 0 0 1px var(--line);
		text-align: left;
		font: inherit;
		color: var(--ink);
		cursor: pointer;
		transition:
			background 0.2s,
			box-shadow 0.2s,
			transform 0.2s var(--ease-out);
	}

	.chapter:hover {
		transform: translateY(-2px);
		background: var(--paper-light);
	}

	.chapter[aria-pressed='true'] {
		background: var(--brown-dark);
		box-shadow:
			0 12px 24px -14px rgb(68 46 22 / 0.8),
			inset 0 0 0 1px var(--brown-dark);
		color: var(--paper-light);
	}

	.chapter-no {
		font-size: 12px;
		color: var(--gold-dark);
	}

	.chapter[aria-pressed='true'] .chapter-no {
		color: var(--gold);
	}

	.chapter-title {
		font: 500 20px/1.2 var(--font-display);
	}

	.chapter-meta {
		font-size: 13px;
		color: var(--ink-muted);
	}

	.chapter[aria-pressed='true'] .chapter-meta {
		color: var(--sand);
	}

	/* Album */
	.album-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 4px 24px;
		margin: 40px 0 28px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--line);
	}

	.album-head h3 {
		font-size: clamp(24px, 3vw, 34px);
		font-weight: 450;
	}

	.album-head p {
		font-size: 14px;
		color: var(--ink-muted);
	}

	.prints {
		columns: 3 240px;
		column-gap: 22px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.prints li {
		break-inside: avoid;
		padding: 6px 0 18px;
		animation: develop 0.7s calc(var(--i) * 55ms) var(--ease-out) both;
	}

	@keyframes develop {
		from {
			opacity: 0;
			transform: translateY(24px) rotate(0deg);
			filter: sepia(1) brightness(1.4) blur(4px);
		}
	}

	/* Cetakan foto: bingkai kertas, sedikit miring, ada selotip */
	.print {
		position: relative;
		display: block;
		width: 100%;
		padding: 10px 10px 30px;
		border: 0;
		border-radius: 3px;
		background: #fffdf8;
		box-shadow:
			0 1px 2px rgb(68 46 22 / 0.12),
			0 14px 28px -16px rgb(68 46 22 / 0.55);
		transform: rotate(var(--r));
		cursor: zoom-in;
		transition:
			transform 0.35s var(--ease-out),
			box-shadow 0.35s var(--ease-out);
	}

	.print::before {
		content: '';
		position: absolute;
		z-index: 2;
		top: -9px;
		left: 50%;
		width: 74px;
		height: 20px;
		background: rgb(229 210 154 / 0.72);
		box-shadow: 0 1px 2px rgb(68 46 22 / 0.15);
		transform: translateX(-50%) rotate(calc(var(--r) * -2));
	}

	.print:hover,
	.print:focus-visible {
		z-index: 3;
		transform: rotate(0deg) translateY(-6px) scale(1.025);
		box-shadow:
			0 2px 4px rgb(68 46 22 / 0.12),
			0 28px 40px -18px rgb(68 46 22 / 0.65);
	}

	.print img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 1px;
		background: var(--sand);
		filter: saturate(0.92) contrast(1.02);
		transition: filter 0.35s;
	}

	.print:hover img {
		filter: none;
	}

	.frame-no {
		position: absolute;
		left: 12px;
		bottom: 8px;
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--ink-muted);
	}

	.zoom {
		position: absolute;
		right: 18px;
		bottom: 40px;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgb(44 30 17 / 0.72);
		opacity: 0;
		transform: scale(0.7);
		transition:
			opacity 0.25s,
			transform 0.25s var(--ease-out);
	}

	.zoom svg,
	.lightbox svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.zoom svg {
		color: var(--paper-light);
	}

	.print:hover .zoom,
	.print:focus-visible .zoom {
		opacity: 1;
		transform: none;
	}

	.more {
		display: flex;
		justify-content: center;
		margin-top: 18px;
	}

	/* Lightbox */
	.lightbox {
		--lb-chrome: 170px;
		width: 100vw;
		max-width: none;
		height: 100dvh;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--paper-light);
		overflow: hidden;
	}

	.lightbox[open] {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
	}

	.lightbox::backdrop {
		background: rgb(24 16 8 / 0.94);
		backdrop-filter: blur(6px);
		animation: fade 0.35s ease both;
	}

	.lightbox:global(.closing)::backdrop {
		animation: fade 0.28s ease reverse both;
	}

	.lightbox:global(.closing) .lb-top,
	.lightbox:global(.closing) .lb-strip,
	.lightbox:global(.closing) .lb-nav {
		opacity: 0;
		transition: opacity 0.2s;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	:global(html:has(dialog.lightbox[open])) {
		overflow: hidden;
	}

	.lb-top {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 14px clamp(16px, 3vw, 28px);
		animation: fade 0.4s 0.15s both;
	}

	.lb-caption {
		display: grid;
		flex: 1;
		min-width: 0;
		line-height: 1.25;
	}

	.lb-caption strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font: 500 18px var(--font-display);
	}

	.lb-caption span {
		font-size: 13px;
		color: var(--sand);
	}

	.lb-count {
		font-size: 14px;
		color: var(--gold-light);
	}

	.lb-close,
	.lb-nav {
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: rgb(247 243 234 / 0.1);
		color: var(--paper-light);
		cursor: pointer;
		transition: background 0.2s;
	}

	.lb-close {
		width: 44px;
		height: 44px;
	}

	.lb-close:hover,
	.lb-nav:hover {
		background: rgb(247 243 234 / 0.22);
	}

	.lb-stage {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 0;
		padding: 8px clamp(16px, 7vw, 96px);
		touch-action: pan-y;
	}

	/* Ukuran dihitung dari lebar/tinggi foto (bukan menunggu gambar termuat) supaya animasi
	   membesar langsung tahu posisi akhirnya. --lb-chrome = tinggi bilah atas + filmstrip. */
	.lb-img {
		display: block;
		height: auto;
		border-radius: 4px;
		background-size: cover;
		box-shadow: 0 30px 80px -20px rgb(0 0 0 / 0.8);
		transform-origin: top left;
		user-select: none;
		-webkit-user-drag: none;
	}

	.lb-nav {
		position: absolute;
		top: 50%;
		width: 52px;
		height: 52px;
		margin-top: -26px;
		animation: fade 0.4s 0.2s both;
	}

	.lb-nav.prev {
		left: clamp(8px, 2vw, 24px);
	}

	.lb-nav.next {
		right: clamp(8px, 2vw, 24px);
	}

	.lb-strip {
		display: flex;
		gap: 8px;
		padding: 12px clamp(16px, 3vw, 28px) max(16px, env(safe-area-inset-bottom));
		overflow-x: auto;
		scrollbar-width: none;
		animation: fade 0.4s 0.2s both;
	}

	.lb-strip button {
		flex: none;
		width: 64px;
		height: 48px;
		padding: 0;
		border: 0;
		border-radius: 4px;
		overflow: hidden;
		background: none;
		opacity: 0.45;
		cursor: pointer;
		transition:
			opacity 0.2s,
			transform 0.2s;
	}

	.lb-strip button:hover {
		opacity: 0.8;
	}

	.lb-strip button[aria-current='true'] {
		opacity: 1;
		transform: translateY(-3px);
		box-shadow: 0 0 0 2px var(--gold);
	}

	.lb-strip img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	@media (max-width: 640px) {
		.prints {
			columns: 2;
			column-gap: 14px;
		}

		.print {
			padding: 6px 6px 22px;
		}

		.print::before {
			width: 52px;
			height: 16px;
		}

		.frame-no {
			left: 8px;
			bottom: 5px;
			font-size: 10px;
		}

		.lb-nav {
			display: none;
		}

		.lb-stage {
			padding-inline: 8px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.prints li {
			animation: none;
		}
	}
</style>
