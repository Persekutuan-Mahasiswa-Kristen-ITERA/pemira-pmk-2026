<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resizeImage } from '#lib/resize-image.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let uploadingId = $state<number | null>(null);
	let photoError = $state<string | null>(null);

	/** Perkecil foto di browser dulu, baru kirim. */
	const uploadPhoto: SubmitFunction = async ({ formData, cancel }) => {
		photoError = null;
		const file = formData.get('photo');
		if (!(file instanceof File) || file.size === 0) {
			cancel();
			return;
		}
		try {
			formData.set('photo', await resizeImage(file), 'foto');
		} catch {
			photoError = 'Foto tidak bisa dibaca. Gunakan berkas JPG, PNG, atau WebP.';
			cancel();
			return;
		}
		uploadingId = Number(formData.get('id'));
		return async ({ update }) => {
			await update();
			uploadingId = null;
		};
	};

	let nextNumber = $derived(Math.max(0, ...data.candidates.map((c) => c.number)) + 1);
</script>

<svelte:head>
	<title>Calon · Admin Pemira</title>
</svelte:head>

<h1>Calon ketua</h1>

{#if photoError}<p class="msg-error" role="alert">{photoError}</p>{/if}
{#if form?.error}<p class="msg-error" role="alert">{form.error}</p>{/if}
{#if form?.ok}<p class="msg-ok" role="status">{form.ok}</p>{/if}

{#if data.locked}
	<p class="hint">Daftar calon terkunci karena pemilihan sudah dibuka.</p>
{/if}

{#each data.candidates as c (c.id)}
	<div class="panel cand">
		<div class="photo-col">
			<div class="frame">
				{#if c.photo}
					<img src={c.photo} alt="Foto {c.name}" />
				{:else}
					<span class="frame-empty" aria-hidden="true">{c.number}</span>
				{/if}
				{#if uploadingId === c.id}<span class="frame-busy">Mengunggah…</span>{/if}
			</div>
			{#if !data.locked}
				<form
					method="POST"
					action="?/photo"
					enctype="multipart/form-data"
					use:enhance={uploadPhoto}
				>
					<input type="hidden" name="id" value={c.id} />
					<label class="photo-btn">
						<input
							class="visually-hidden"
							type="file"
							name="photo"
							accept="image/*"
							disabled={uploadingId !== null}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
						{c.photo ? 'Ganti foto' : 'Unggah foto'}
					</label>
				</form>
				{#if c.photo}
					<form
						method="POST"
						action="?/photoDelete"
						use:enhance={({ cancel }) => {
							if (!confirm(`Hapus foto calon No. ${c.number}?`)) cancel();
						}}
					>
						<input type="hidden" name="id" value={c.id} />
						<button class="photo-remove" type="submit">Hapus foto</button>
					</form>
				{/if}
			{/if}
		</div>
		<form method="POST" action="?/update" use:enhance class="cand-form">
			<input type="hidden" name="id" value={c.id} />
			<fieldset disabled={data.locked}>
				<div class="row">
					<label class="field">
						No. urut
						<input type="number" name="number" min="1" value={c.number} required />
					</label>
					<label class="field">
						Nama
						<input name="name" value={c.name} required />
					</label>
				</div>
				<label class="field">
					Visi
					<textarea name="vision" rows="2">{c.vision}</textarea>
				</label>
				<label class="field">
					Misi
					<textarea name="mission" rows="3">{c.mission}</textarea>
				</label>
				{#if !data.locked}
					<div class="actions">
						<button class="button" type="submit">Simpan</button>
						<button
							class="button button-danger"
							type="submit"
							formaction="?/delete"
							onclick={(e) => {
								if (!confirm(`Hapus calon No. ${c.number} (${c.name})?`)) e.preventDefault();
							}}
						>
							Hapus
						</button>
					</div>
				{/if}
			</fieldset>
		</form>
	</div>
{:else}
	<p class="hint">Belum ada calon.</p>
{/each}

{#if !data.locked}
	<h2>Tambah calon</h2>
	<form method="POST" action="?/create" use:enhance class="panel">
		<div class="row">
			<label class="field">
				No. urut
				<input type="number" name="number" min="1" value={nextNumber} required />
			</label>
			<label class="field">
				Nama
				<input name="name" required />
			</label>
		</div>
		<label class="field">
			Visi
			<textarea name="vision" rows="2"></textarea>
		</label>
		<label class="field">
			Misi
			<textarea name="mission" rows="3"></textarea>
		</label>
		<button class="button" type="submit">Tambah calon</button>
		<p class="hint add-hint">Foto bisa diunggah setelah calon ditambahkan.</p>
	</form>
{/if}

<style>
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}

	.row {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 0 16px;
	}

	.cand {
		display: grid;
		grid-template-columns: 150px minmax(0, 1fr);
		align-items: start;
		gap: 28px;
	}

	.photo-col {
		display: grid;
		gap: 8px;
	}

	.frame {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border-radius: 8px;
		background: var(--sand);
		box-shadow: inset 0 0 0 1.5px var(--brown);
	}

	.frame img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}

	.frame-empty {
		font: italic 400 72px/1 var(--font-display);
		color: var(--gold-dark);
	}

	.frame-busy {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgb(68 46 22 / 0.7);
		font-size: 13px;
		font-weight: 800;
		color: var(--paper-light);
	}

	.photo-btn {
		display: block;
		padding: 8px 12px;
		border-radius: 999px;
		background: var(--brown);
		font-size: 13px;
		font-weight: 800;
		text-align: center;
		color: var(--paper-light);
		cursor: pointer;
	}

	.photo-btn:hover {
		background: var(--brown-dark);
	}

	.photo-btn:has(input:focus-visible) {
		outline: 3px solid var(--gold);
		outline-offset: 3px;
	}

	.photo-btn:has(input:disabled) {
		opacity: 0.5;
		cursor: progress;
	}

	.photo-remove {
		width: 100%;
		padding: 4px;
		border: 0;
		background: none;
		font: 700 13px var(--font-body);
		color: var(--danger);
		text-decoration: underline;
		cursor: pointer;
	}

	.add-hint {
		margin-top: 12px;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	@media (max-width: 700px) {
		.cand {
			grid-template-columns: 1fr;
		}

		.photo-col {
			width: 150px;
		}
	}

	@media (max-width: 480px) {
		.row {
			grid-template-columns: 1fr;
		}
	}
</style>
