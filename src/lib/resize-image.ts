/**
 * Perkecil foto di browser sebelum diunggah, supaya yang tersimpan di database hanya
 * gambar kecil (maks. 720×960, WebP atau JPEG). Orientasi EXIF dari kamera HP ikut dibaca.
 */
export async function resizeImage(file: Blob, maxWidth = 720, maxHeight = 960): Promise<Blob> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas tidak tersedia');
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	const encode = (type: string) =>
		new Promise<Blob | null>((done) => canvas.toBlob(done, type, 0.85));
	// Browser yang tidak bisa membuat WebP mengembalikan PNG; pakai JPEG agar tetap kecil.
	let blob = await encode('image/webp');
	if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg');
	if (!blob) throw new Error('Gagal memproses foto');
	return blob;
}
