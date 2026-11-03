import { analyzeQuality, compressForUpload, loadImage, loadImageFromBlob } from './image-tools';

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Rasmni o‘qib bo‘lmadi'));
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Device file -> compressed JPEG data URL (max 1600px), or throws a user-readable error. */
export async function fileToPhotoDataUrl(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    throw new Error('Faqat JPEG, PNG yoki WebP rasm yuklang');
  }
  const img = await loadImageFromBlob(file);
  return blobToDataUrl(await compressForUpload(img));
}

export { analyzeQuality, loadImage, loadImageFromBlob, compressForUpload };
