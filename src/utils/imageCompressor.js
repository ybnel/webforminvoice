/**
 * High-performance client-side image compressor for invoice & receipt images.
 * Uses native Canvas and ObjectURLs to prevent high RAM spikes and long blocking times.
 */

export const compressImageFile = (file, maxWidth = 900, maxHeight = 900, quality = 0.55) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve({ file, base64Url: null, size: file ? file.size : 0 });
      return;
    }

    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      console.warn("Could not create object URL:", e);
      resolve({ file, base64Url: null, size: file.size });
      return;
    }

    const img = new Image();

    img.onload = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        
        // Fill white background in case of transparent PNG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob((blob) => {
          if (blob) {
            const cleanName = (file.name || 'receipt.jpg').replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve({
              file: compressedFile,
              base64Url: dataUrl,
              size: compressedFile.size
            });
          } else {
            resolve({
              file: file,
              base64Url: dataUrl,
              size: file.size
            });
          }
        }, 'image/jpeg', quality);
      } catch (err) {
        console.error("Image canvas compression error:", err);
        resolve({ file, base64Url: null, size: file.size });
      }
    };

    img.onerror = (err) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      console.warn("Image load failed for compression:", err);
      resolve({ file, base64Url: null, size: file.size });
    };

    img.src = objectUrl;
  });
};

export const dataURLtoFile = (dataurl, filename) => {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (err) {
    console.error("Error converting data URL to file:", err);
    return null;
  }
};
