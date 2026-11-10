import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.js';
import { blobToBytes } from '#lib/server/photos.js';
import type { RequestHandler } from './$types';

/** Foto calon bersifat publik, sama seperti nama calon di beranda. */
export const GET: RequestHandler = async ({ params, url }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Foto tidak ditemukan.');

	const row = await getDb()
		.prepare('SELECT mime, data, updated_at FROM candidate_photos WHERE candidate_id = ?')
		.bind(id)
		.first<{ mime: string; data: unknown; updated_at: number }>();
	if (!row) error(404, 'Foto tidak ditemukan.');

	// URL berversi (?v=waktu unggah) boleh di-cache lama karena berubah saat foto diganti.
	const versioned = url.searchParams.get('v') === String(row.updated_at);
	return new Response(blobToBytes(row.data) as Uint8Array<ArrayBuffer>, {
		headers: {
			'content-type': row.mime,
			'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=60'
		}
	});
};
