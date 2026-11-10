import { photoUrl } from '#lib/photo-url.js';

/** Peta id calon → URL foto, untuk calon yang punya foto. */
export async function candidatePhotos(db: D1Database): Promise<Map<number, string>> {
	const { results } = await db
		.prepare('SELECT candidate_id, updated_at FROM candidate_photos')
		.all<{ candidate_id: number; updated_at: number }>();
	return new Map(
		results.map((r) => [r.candidate_id, photoUrl(r.candidate_id, r.updated_at) as string])
	);
}
