<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let nextNumber = $derived(Math.max(0, ...data.candidates.map((c) => c.number)) + 1);
</script>

<svelte:head>
	<title>Calon · Admin Pemira</title>
</svelte:head>

<h1>Calon ketua</h1>

{#if form?.error}<p class="msg-error" role="alert">{form.error}</p>{/if}
{#if form?.ok}<p class="msg-ok" role="status">{form.ok}</p>{/if}

{#if data.locked}
	<p class="hint">Daftar calon terkunci karena pemilihan sudah dibuka.</p>
{/if}

{#each data.candidates as c (c.id)}
	<form method="POST" action="?/update" use:enhance class="panel cand">
		<span class="cand-badge" aria-hidden="true">{c.number}</span>
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

	form.panel.cand {
		position: relative;
		padding-left: 104px;
	}

	.cand-badge {
		position: absolute;
		top: 18px;
		left: 28px;
		font: italic 400 56px/1 var(--font-display);
		color: var(--gold-dark);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	@media (max-width: 700px) {
		form.panel.cand {
			padding-left: 18px;
		}

		.cand-badge {
			display: none;
		}
	}

	@media (max-width: 480px) {
		.row {
			grid-template-columns: 1fr;
		}
	}
</style>
