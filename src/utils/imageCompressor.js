/**
 * High-performance client-side image compressor and filter engine for invoice & receipt images.
 * Guaranteed to NEVER hang (includes a 2500ms safety timeout and automatic FileReader fallback).
 */

export const fallbackFileReader = (file) => {
  return new Promise((resolve) => {
    if (!file || !(file instanceof Blob || file instanceof File)) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export const compressImageFile = (file, maxWidth = 900, maxHeight = 900, quality = 0.55, filterType = 'color') => {
  return new Promise((resolve) => {
    if (!file || !(file instanceof Blob || file instanceof File)) {
      resolve({ file, base64Url: null, size: file?.size || 0 });
      return;
    }

    let isResolved = false;
    const safeResolve = (result) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timer);
        resolve(result);
      }
    };

    // Safety timeout: if Image/Canvas doesn't finish in 2500ms, use FileReader fallback
    const timer = setTimeout(() => {
      console.warn("Image compression timed out, using fallback reader for:", file.name || 'file');
      fallbackFileReader(file).then((b64) => {
        safeResolve({ file, base64Url: b64, size: file.size });
      }).catch(() => {
        safeResolve({ file, base64Url: null, size: file.size });
      });
    }, 2500);

    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      console.warn("Could not create object URL, using fallback reader:", e);
      fallbackFileReader(file).then((b64) => {
        safeResolve({ file, base64Url: b64, size: file.size });
      }).catch(() => {
        safeResolve({ file, base64Url: null, size: file.size });
      });
      return;
    }

    const img = new Image();

    img.onload = () => {
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch (_) {}
      }
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          fallbackFileReader(file).then((b64) => {
            safeResolve({ file, base64Url: b64, size: file.size });
          });
          return;
        }

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
        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: filterType === 'bw' });
        
        // Fill white background in case of transparent PNG/screenshot
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Apply high-contrast B&W document filter if requested
        if (filterType === 'bw') {
          try {
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            const contrast = 1.35;
            const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
            
            for (let i = 0; i < data.length; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
              data[i] = enhanced;
              data[i + 1] = enhanced;
              data[i + 2] = enhanced;
            }
            ctx.putImageData(imgData, 0, 0);
          } catch (filterErr) {
            console.warn("BW pixel manipulation fallback:", filterErr);
          }
        }

        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob((blob) => {
          if (blob) {
            const cleanName = (file.name || 'receipt.jpg').replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            safeResolve({
              file: compressedFile,
              base64Url: dataUrl,
              size: compressedFile.size
            });
          } else {
            safeResolve({
              file: file,
              base64Url: dataUrl,
              size: file.size
            });
          }
        }, 'image/jpeg', quality);
      } catch (err) {
        console.error("Image canvas compression error, fallback to reader:", err);
        fallbackFileReader(file).then((b64) => {
          safeResolve({ file, base64Url: b64, size: file.size });
        }).catch(() => {
          safeResolve({ file, base64Url: null, size: file.size });
        });
      }
    };

    img.onerror = (err) => {
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch (_) {}
      }
      console.warn("Image load failed, fallback to reader:", err);
      fallbackFileReader(file).then((b64) => {
        safeResolve({ file, base64Url: b64, size: file.size });
      }).catch(() => {
        safeResolve({ file, base64Url: null, size: file.size });
      });
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
