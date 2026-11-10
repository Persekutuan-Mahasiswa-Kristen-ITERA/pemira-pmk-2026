<script lang="ts">
	import { formatWib } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Audit log · Admin Pemira</title>
</svelte:head>

<h1>Audit log</h1>
<p class="hint">
	Semua tindakan admin tercatat di sini dan tidak bisa diubah atau dihapus (dijaga oleh database).
</p>

{#if data.entries.length === 0}
	<p class="hint">Belum ada catatan.</p>
{:else}
	<div class="scroll">
		<table>
			<thead>
				<tr><th>#</th><th>Waktu</th><th>Admin</th><th>Aksi</th><th>Detail</th></tr>
			</thead>
			<tbody>
				{#each data.entries as e (e.id)}
					<tr>
						<td>{e.id}</td>
						<td>{formatWib(e.at)}</td>
						<td>{e.actor_email}</td>
						<td><code>{e.action}</code></td>
						<td class="mono">{e.detail}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.scroll {
		margin-top: 20px;
		overflow-x: auto;
	}
</style>
