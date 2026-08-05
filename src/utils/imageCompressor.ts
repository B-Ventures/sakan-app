/**
 * Compresses an image file client-side to ensure Base64 string stays small
 * and well under Firestore's 1MB document size limit.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 750,
  maxHeight = 750,
  quality = 0.5
): Promise<string> {
  // If non-image (like PDF), check raw size before Base64 encoding
  if (!file.type.startsWith('image/')) {
    if (file.size > 524288) { // 512KB limit for PDFs
      throw new Error(`PDF_TOO_LARGE: File size (${Math.round(file.size / 1024)}KB) exceeds the 500KB limit for document storage.`);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // First pass compression
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // If dataUrl is still > 350KB, attempt aggressive second pass
        if (dataUrl.length > 350000) {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(width * 0.7);
          smallCanvas.height = Math.round(height * 0.7);
          const smallCtx = smallCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
            dataUrl = smallCanvas.toDataURL('image/jpeg', 0.4);
          }
        }

        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

