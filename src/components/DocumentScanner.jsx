import React, { useState, useEffect, useRef } from 'react';
import { Camera, FileText, Loader2, Sparkles, X, RefreshCw, Check } from 'lucide-react';

// Helper to convert Data URL (base64) to a File object
const dataURLtoFile = (dataurl, filename) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

function DocumentScanner({
  initialQueue = [],
  editAttachment = null,
  onClose,
  onSaveScan,
  onSaveEdit
}) {
  const [isCvLoading, setIsCvLoading] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [scanStep, setScanStep] = useState('scanning'); // 'scanning' | 'confirm_upload' | 'cropping' | 'preview'
  const [rawCapturedPhoto, setRawCapturedPhoto] = useState(null); // Full uncropped image data URL
  const [displayCorners, setDisplayCorners] = useState(null); // Normalized coordinates (0 to 1)
  const [activeHandle, setActiveHandle] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null); // Cropped image (Data URL)
  const [filteredImage, setFilteredImage] = useState(null); // Filtered cropped image (Data URL)
  const [filterType, setFilterType] = useState('color'); // 'color' | 'bw'

  const [currentFile, setCurrentFile] = useState(null);
  const [localQueue, setLocalQueue] = useState([]);

  // Refs for video & canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const activeHandleRef = useRef(null);

  // Initialize OpenCV and jscanify loading
  useEffect(() => {
    const initScanner = () => {
      if (window.cv && window.cv.Mat && window.jscanify) {
        setScannerInstance(new window.jscanify());
        setIsCvLoading(false);
      } else {
        setTimeout(initScanner, 200);
      }
    };

    if (!window.cv || !window.cv.Mat || !window.jscanify) {
      setIsCvLoading(true);
      initScanner();
    } else {
      setScannerInstance(new window.jscanify());
      setIsCvLoading(false);
    }
  }, []);

  // Setup queue or editing mode on mount / props change
  useEffect(() => {
    if (editAttachment) {
      setRawCapturedPhoto(editAttachment.url);
      setScanStep('cropping');
      setCurrentFile(null);
      setLocalQueue([]);
    } else if (initialQueue && initialQueue.length > 0) {
      const firstFile = initialQueue[0];
      const remainingQueue = initialQueue.slice(1);
      setLocalQueue(remainingQueue);
      setCurrentFile(firstFile);

      const url = URL.createObjectURL(firstFile);
      setRawCapturedPhoto(url);
      setScanStep('confirm_upload');
    } else {
      setScanStep('scanning');
      setRawCapturedPhoto(null);
      setCurrentFile(null);
      setLocalQueue([]);
    }
    setFilterType('color');
    setCapturedImage(null);
    setFilteredImage(null);
    setDisplayCorners(null);
    setActiveHandle(null);
  }, [initialQueue, editAttachment]);

  // Camera stream handler (scanning mode)
  useEffect(() => {
    let animationFrameId;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 960 }
          }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();

          videoRef.current.onloadedmetadata = () => {
            animationFrameId = requestAnimationFrame(processFrame);
          };
        }
      } catch (err) {
        console.error("Failed to access camera:", err);
        alert("Camera access failed. Please ensure camera permissions are enabled in your browser settings.");
        onClose();
      }
    };

    const processFrame = () => {
      if (videoRef.current && canvasRef.current && scannerInstance) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          try {
            const resultCanvas = scannerInstance.highlightPaper(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(resultCanvas, 0, 0, canvas.width, canvas.height);
          } catch (e) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        }
      }
      if (scanStep === 'scanning') {
        animationFrameId = requestAnimationFrame(processFrame);
      }
    };

    if (scanStep === 'scanning' && !isCvLoading && scannerInstance) {
      startCamera();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [scanStep, isCvLoading, scannerInstance]);

  // Capture uncropped frame from camera
  const handleCapture = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

      setRawCapturedPhoto(dataUrl);
      setScanStep('cropping');
    } catch (err) {
      console.error("Capture failure:", err);
      alert("Failed to capture photo. Please try again.");
    }
  };

  // Called when rawCapturedPhoto loads inside crop container
  const handleImageLoad = (e) => {
    const img = e.target;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    if (window.cv && window.cv.Mat && scannerInstance) {
      try {
        const mat = window.cv.imread(img);
        const contour = scannerInstance.findPaperContour(mat);
        const corners = scannerInstance.getCornerPoints(contour);
        mat.delete();

        if (corners && corners.topLeftCorner && corners.topRightCorner && corners.bottomLeftCorner && corners.bottomRightCorner) {
          setDisplayCorners({
            topLeftCorner: { x: corners.topLeftCorner.x / naturalWidth, y: corners.topLeftCorner.y / naturalHeight },
            topRightCorner: { x: corners.topRightCorner.x / naturalWidth, y: corners.topRightCorner.y / naturalHeight },
            bottomLeftCorner: { x: corners.bottomLeftCorner.x / naturalWidth, y: corners.bottomLeftCorner.y / naturalHeight },
            bottomRightCorner: { x: corners.bottomRightCorner.x / naturalWidth, y: corners.bottomRightCorner.y / naturalHeight }
          });
          return;
        }
      } catch (err) {
        console.error("Auto corner detection failed, using fallback:", err);
      }
    }

    // Bounding box corners fallback
    setDisplayCorners({
      topLeftCorner: { x: 0.1, y: 0.1 },
      topRightCorner: { x: 0.9, y: 0.1 },
      bottomLeftCorner: { x: 0.1, y: 0.9 },
      bottomRightCorner: { x: 0.9, y: 0.9 }
    });
  };

  const handlePointerDown = (e, handleName) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    activeHandleRef.current = handleName;
    setActiveHandle(handleName);
  };

  const handlePointerMove = (e, handleName) => {
    if (activeHandleRef.current !== handleName || !displayCorners) return;
    e.preventDefault();

    const container = e.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));

    const normalizedX = rect.width > 0 ? x / rect.width : 0;
    const normalizedY = rect.height > 0 ? y / rect.height : 0;

    setDisplayCorners(prev => ({
      ...prev,
      [handleName]: { x: normalizedX, y: normalizedY }
    }));
  };

  const handlePointerUp = (e, handleName) => {
    if (activeHandleRef.current === handleName) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) { }
      activeHandleRef.current = null;
      setActiveHandle(null);
    }
  };

  const handleCropApply = () => {
    if (!rawCapturedPhoto || !displayCorners || !scannerInstance) return;

    const img = new window.Image();
    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        const originalCorners = {
          topLeftCorner: {
            x: displayCorners.topLeftCorner.x * naturalWidth,
            y: displayCorners.topLeftCorner.y * naturalHeight
          },
          topRightCorner: {
            x: displayCorners.topRightCorner.x * naturalWidth,
            y: displayCorners.topRightCorner.y * naturalHeight
          },
          bottomLeftCorner: {
            x: displayCorners.bottomLeftCorner.x * naturalWidth,
            y: displayCorners.bottomLeftCorner.y * naturalHeight
          },
          bottomRightCorner: {
            x: displayCorners.bottomRightCorner.x * naturalWidth,
            y: displayCorners.bottomRightCorner.y * naturalHeight
          }
        };

        const croppedCanvas = scannerInstance.extractPaper(img, 600, 800, originalCorners);
        const dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.6);
        setCapturedImage(dataUrl);
        setScanStep('preview');
      } catch (err) {
        console.error("Crop action failed:", err);
        alert("Failed to crop image. Please try again.");
      }
    };
    img.src = rawCapturedPhoto;
  };

  // Filter effect (OpenCV)
  useEffect(() => {
    if (!capturedImage) return;

    if (filterType === 'color') {
      setFilteredImage(capturedImage);
    } else if (filterType === 'bw') {
      if (window.cv && window.cv.Mat) {
        try {
          const img = new window.Image();
          img.onload = () => {
            const src = window.cv.imread(img);
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

            const tempCanvas = document.createElement('canvas');
            window.cv.imshow(tempCanvas, dst);
            setFilteredImage(tempCanvas.toDataURL('image/jpeg', 0.6));

            src.delete();
            dst.delete();
          };
          img.src = capturedImage;
        } catch (e) {
          console.error("OpenCV filter processing failed:", e);
          setFilteredImage(capturedImage);
        }
      } else {
        setFilteredImage(capturedImage);
      }
    }
  }, [capturedImage, filterType]);

  const processNextInQueue = (currentQueue) => {
    const queueToUse = currentQueue !== undefined ? currentQueue : localQueue;
    if (queueToUse.length > 0) {
      const nextFile = queueToUse[0];
      const nextQueue = queueToUse.slice(1);
      setLocalQueue(nextQueue);
      setCurrentFile(nextFile);

      const url = URL.createObjectURL(nextFile);
      setRawCapturedPhoto(url);
      setScanStep('confirm_upload');
    } else {
      onClose();
    }
  };

  const handleSaveScan = () => {
    if (!filteredImage) return;

    const timestamp = Date.now();
    const generatedFileName = `scanned_invoice_${timestamp}.jpg`;
    const file = dataURLtoFile(filteredImage, generatedFileName);

    if (editAttachment) {
      if (editAttachment.url && editAttachment.url.startsWith('blob:')) {
        URL.revokeObjectURL(editAttachment.url);
      }
      onSaveEdit({
        ...editAttachment,
        file: file,
        url: filteredImage,
        name: generatedFileName,
        size: file.size
      });
      onClose();
    } else {
      onSaveScan({
        id: timestamp,
        file: file,
        url: filteredImage,
        name: generatedFileName,
        size: file.size
      });
      processNextInQueue();
    }
  };

  const handleAttachDirectly = () => {
    if (!currentFile || !rawCapturedPhoto) return;

    onSaveScan({
      id: Date.now(),
      file: currentFile,
      url: rawCapturedPhoto,
      name: currentFile.name,
      size: currentFile.size
    });
    setCurrentFile(null);
    processNextInQueue();
  };

  const handleSkipOrCancelUpload = () => {
    if (rawCapturedPhoto && rawCapturedPhoto.startsWith('blob:')) {
      URL.revokeObjectURL(rawCapturedPhoto);
    }
    setCurrentFile(null);
    processNextInQueue();
  };

  return (
    <div className="scanner-page">
      <div className="scanner-page-header">
        <h3><Camera size={20} /> Receipt Document Scanner</h3>
        <button
          type="button"
          className="scanner-close-btn"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="scanner-page-body">
        {isCvLoading && (
          <div className="scanner-loading-overlay">
            <Loader2 className="scanner-spinner" size={32} />
            <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>Loading OpenCV & Scanner modules...</p>
          </div>
        )}

        {scanStep === 'scanning' && (
          <div className="scanner-viewport">
            <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
            <canvas ref={canvasRef} className="scanner-canvas-overlay" />
            <div className="scanner-status-toast">
              Align the receipt within the frame for a clear scan
            </div>
          </div>
        )}

        {scanStep === 'confirm_upload' && (
          <div className="scanner-step-container">
            <div className="scanner-status-toast" style={{ position: 'relative', top: 'auto', marginBottom: '1rem' }}>
              Confirm Attachment
            </div>
            {rawCapturedPhoto ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <img src={rawCapturedPhoto} className="scan-preview" alt="Attachment preview" />
                {currentFile && (
                  <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-main)', background: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', maxWidth: '90%', wordBreak: 'break-all' }}>
                    <strong>{currentFile.name}</strong> ({(currentFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="scanner-spinner" size={24} />
              </div>
            )}
          </div>
        )}

        {scanStep === 'cropping' && (
          <div className="scanner-step-container">
            <div className="scanner-status-toast" style={{ position: 'relative', top: 'auto', marginBottom: '1rem' }}>
              Adjust the receipt corners
            </div>
            <div className="crop-container" id="crop-container-element">
              <div className="crop-wrapper">
                <img
                  src={rawCapturedPhoto}
                  onLoad={handleImageLoad}
                  className="crop-image"
                  alt="Raw captured paper"
                />
                {displayCorners && (
                  <>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    >
                      <polygon
                        points={
                          `${displayCorners.topLeftCorner.x * 100},${displayCorners.topLeftCorner.y * 100} ` +
                          `${displayCorners.topRightCorner.x * 100},${displayCorners.topRightCorner.y * 100} ` +
                          `${displayCorners.bottomRightCorner.x * 100},${displayCorners.bottomRightCorner.y * 100} ` +
                          `${displayCorners.bottomLeftCorner.x * 100},${displayCorners.bottomLeftCorner.y * 100}`
                        }
                        fill="rgba(79, 70, 229, 0.2)"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    {Object.keys(displayCorners).map((key) => {
                      const corner = displayCorners[key];
                      return (
                        <div
                          key={key}
                          className={`crop-handle ${activeHandle === key ? 'active' : ''}`}
                          style={{
                            left: `${corner.x * 100}%`,
                            top: `${corner.y * 100}%`
                          }}
                          onPointerDown={(e) => handlePointerDown(e, key)}
                          onPointerMove={(e) => handlePointerMove(e, key)}
                          onPointerUp={(e) => handlePointerUp(e, key)}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {scanStep === 'preview' && (
          <div className="scanner-step-container">
            {filteredImage ? (
              <img src={filteredImage} className="scan-preview" alt="Cropped preview" />
            ) : (
              <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="scanner-spinner" size={24} />
              </div>
            )}

            {/* Filter controls */}
            <div className="filter-group">
              <button
                type="button"
                className={`filter-btn ${filterType === 'color' ? 'active' : ''}`}
                onClick={() => setFilterType('color')}
              >
                <Sparkles size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Original Color
              </button>
              <button
                type="button"
                className={`filter-btn ${filterType === 'bw' ? 'active' : ''}`}
                onClick={() => setFilterType('bw')}
              >
                <FileText size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Scan (B&W Filter)
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="scanner-page-footer">
        {scanStep === 'scanning' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCapture}
            disabled={isCvLoading}
          >
            <Camera size={18} /> Capture Photo
          </button>
        ) : scanStep === 'confirm_upload' ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSkipOrCancelUpload}
            >
              <X size={16} /> Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setScanStep('cropping')}
            >
              <RefreshCw size={16} /> Crop & Adjust
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAttachDirectly}
            >
              <Check size={16} /> Attach Directly
            </button>
          </>
        ) : scanStep === 'cropping' ? (
          <>
            {editAttachment || currentFile ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={editAttachment ? onClose : handleSkipOrCancelUpload}
              >
                <X size={16} /> Cancel
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setScanStep('scanning');
                  setRawCapturedPhoto(null);
                  setDisplayCorners(null);
                }}
              >
                <RefreshCw size={16} /> Retake Photo
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCropApply}
            >
              <Check size={16} /> Apply Crop
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setScanStep('cropping')}
            >
              <RefreshCw size={16} /> Reset Crop
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveScan}
            >
              <Check size={16} /> Save Scanned Receipt
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default DocumentScanner;
