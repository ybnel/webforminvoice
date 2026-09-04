/**
 * Client-side PDF to Image converter using Mozilla's pdf.js.
 * Converts uploaded PDF documents (e-tickets, hotel vouchers, invoices) into high-resolution images.
 */

let isPdfJsLoading = false;
let pdfJsPromise = null;

export const loadPdfJs = () => {
  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfJsPromise) {
    return pdfJsPromise;
  }

  pdfJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error("pdfjsLib not found on window"));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return pdfJsPromise;
};

/**
 * Checks if a given file is a PDF
 */
export const isPdfFile = (file) => {
  if (!file) return false;
  return file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'));
};

/**
 * Converts a PDF File into an array of Image File objects (one per page).
 * @param {File} pdfFile
 * @param {number} scale - Rendering scale (2.0 gives crisp high-definition text for receipts)
 * @returns {Promise<File[]>}
 */
export const convertPdfToImageFiles = async (pdfFile, scale = 2.0) => {
  try {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const convertedImageFiles = [];

    const baseName = pdfFile.name.replace(/\.[^/.]+$/, "");

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      // Fill crisp white background (PDFs often have transparent backgrounds)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      });

      if (blob) {
        const pageSuffix = numPages > 1 ? `_page_${pageNum}` : '';
        const imgFileName = `${baseName}${pageSuffix}.jpg`;
        const imgFile = new File([blob], imgFileName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        convertedImageFiles.push(imgFile);
      }
    }

    return convertedImageFiles;
  } catch (error) {
    console.error("Failed to convert PDF to image:", error);
    throw error;
  }
};

/**
 * Process a mixed array of Files (images and PDFs), converting any PDFs into images.
 * @param {File[]} fileList
 * @returns {Promise<File[]>}
 */
export const processIncomingUploadFiles = async (fileList) => {
  const resultFiles = [];

  for (const file of fileList) {
    if (isPdfFile(file)) {
      try {
        const pages = await convertPdfToImageFiles(file);
        resultFiles.push(...pages);
      } catch (err) {
        console.warn(`Could not convert PDF ${file.name}, skipping:`, err);
        alert(`Failed to convert PDF "${file.name}". Please ensure the PDF is not password protected.`);
      }
    } else {
      resultFiles.push(file);
    }
  }

  return resultFiles;
};
