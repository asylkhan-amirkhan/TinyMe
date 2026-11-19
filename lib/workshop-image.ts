import { validWorkshopImage } from '@/domain/workshop';

/** Keep uploaded artwork small enough to save with the local catalogue. */
export async function prepareWorkshopImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw Error('Выберите PNG, JPEG или WebP размером до 10 МБ.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw Error('Не удалось открыть картинку. Выберите другой файл.'); }
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw Error('Не удалось подготовить картинку.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.75, 0.55, 0.35]) {
      const data = canvas.toDataURL('image/webp', quality);
      if (validWorkshopImage(data)) return data;
    }
    throw Error('Картинка слишком сложная. Попробуйте изображение меньшего размера.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
