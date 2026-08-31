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
    const isString = typeof file === 'string';
    if (!file || (!isString && !(file instanceof Blob || file instanceof File))) {
      resolve({ file, base64Url: isString ? file : null, size: file?.size || 0 });
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
      if (isString) {
        safeResolve({ file, base64Url: file, size: 0 });
      } else {
        fallbackFileReader(file).then((b64) => {
          safeResolve({ file, base64Url: b64, size: file.size });
        }).catch(() => {
          safeResolve({ file, base64Url: null, size: file.size });
        });
      }
    }, 2500);

    let objectUrl = null;
    let shouldRevoke = false;
    if (isString) {
      objectUrl = file;
    } else {
      try {
        objectUrl = URL.createObjectURL(file);
        shouldRevoke = true;
      } catch (e) {
        console.warn("Could not create object URL, using fallback reader:", e);
        fallbackFileReader(file).then((b64) => {
          safeResolve({ file, base64Url: b64, size: file.size });
        }).catch(() => {
          safeResolve({ file, base64Url: null, size: file.size });
        });
        return;
      }
    }

    const img = new Image();

    img.onload = () => {
      if (objectUrl && shouldRevoke) {
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

        // Apply true Scanner Adaptive Thresholding when B&W filter is selected
        if (filterType === 'bw') {
          let appliedCv = false;
          if (window.cv && window.cv.Mat && window.cv.adaptiveThreshold) {
            try {
              const src = window.cv.imread(canvas);
              const dst = new window.cv.Mat();
              window.cv.cvtColor(src, src, window.cv.COLOR_RGBA2GRAY, 0);
              window.cv.adaptiveThreshold(
                src,
                dst,
                255,
                window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                window.cv.THRESH_BINARY,
                11,
                10
              );
              window.cv.imshow(canvas, dst);
              src.delete();
              dst.delete();
              appliedCv = true;
            } catch (cvErr) {
              console.warn("OpenCV adaptive threshold in compressor failed, falling back to integral image:", cvErr);
            }
          }

          if (!appliedCv) {
            try {
              const imgData = ctx.getImageData(0, 0, width, height);
              const data = imgData.data;
              const grayscale = new Uint8Array(width * height);

              for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                grayscale[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
              }

              // Fast integral image adaptive binarization (approximates OpenCV Adaptive Gaussian)
              const S = Math.max(Math.round(width / 16), 4);
              const T = 10;
              const integral = new Uint32Array(width * height);

              for (let i = 0; i < width; i++) {
                let sum = 0;
                for (let j = 0; j < height; j++) {
                  sum += grayscale[j * width + i];
                  integral[j * width + i] = (i === 0 ? 0 : integral[j * width + i - 1]) + sum;
                }
              }

              const halfS = Math.floor(S / 2);
              for (let i = 0; i < width; i++) {
                for (let j = 0; j < height; j++) {
                  const x1 = Math.max(i - halfS, 0);
                  const x2 = Math.min(i + halfS, width - 1);
                  const y1 = Math.max(j - halfS, 0);
                  const y2 = Math.min(j + halfS, height - 1);

                  const count = (x2 - x1) * (y2 - y1);
                  const sum = integral[y2 * width + x2] - integral[y1 * width + x2] - integral[y2 * width + x1] + integral[y1 * width + x1];

                  const idx = (j * width + i) * 4;
                  const val = (grayscale[j * width + i] * count <= sum * (100 - T) / 100) ? 0 : 255;
                  data[idx] = val;
                  data[idx + 1] = val;
                  data[idx + 2] = val;
                }
              }

              ctx.putImageData(imgData, 0, 0);
            } catch (jsErr) {
              console.warn("Pure JS adaptive threshold failed:", jsErr);
            }
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
      if (objectUrl && shouldRevoke) {
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
