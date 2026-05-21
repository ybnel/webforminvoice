import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, UploadCloud, FileText, User, Receipt, Camera, Image, X, Check, RefreshCw, Loader2, Sparkles } from 'lucide-react';

// Helper to convert Data URL (base64) to a File object
const dataURLtoFile = (dataurl, filename) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
};

function App() {
  const [items, setItems] = useState([{ id: 1, name: '', qty: 1, price: '' }]);
  const [fileName, setFileName] = useState('');
  
  // Scanned or uploaded file states
  const [scannedFile, setScannedFile] = useState(null);
  const [scannedFileUrl, setScannedFileUrl] = useState(null);

  // Scanner modal states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCvLoading, setIsCvLoading] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [scanStep, setScanStep] = useState('scanning'); // 'scanning' | 'cropping' | 'preview'
  const [rawCapturedPhoto, setRawCapturedPhoto] = useState(null); // Full uncropped image data URL
  const [displayCorners, setDisplayCorners] = useState(null); // Normalized coordinates (0 to 1)
  const [activeHandle, setActiveHandle] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null); // Cropped image (Data URL)
  const [filteredImage, setFilteredImage] = useState(null); // Filtered cropped image (Data URL)
  const [filterType, setFilterType] = useState('color'); // 'color' | 'bw'

  // Refs for video & canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const activeHandleRef = useRef(null);

  // Auto-increment / unique id for list items
  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), name: '', qty: 1, price: '' }]);
  };

  const handleRemoveItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseFloat(item.qty) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const total = calculateSubtotal();

  // Initialization check for OpenCV and jscanify
  const initScanner = () => {
    if (window.cv && window.cv.Mat && window.jscanify) {
      if (!scannerInstance) {
        setScannerInstance(new window.jscanify());
      }
      setIsCvLoading(false);
    } else {
      setTimeout(initScanner, 200);
    }
  };

  const handleOpenScanner = () => {
    setIsScannerOpen(true);
    setScanStep('scanning');
    setFilterType('color');
    setCapturedImage(null);
    setFilteredImage(null);
    setRawCapturedPhoto(null);
    setDisplayCorners(null);
    setActiveHandle(null);

    // If libraries aren't loaded globally yet, await them
    if (!window.cv || !window.cv.Mat || !window.jscanify) {
      setIsCvLoading(true);
      initScanner();
    } else {
      if (!scannerInstance) {
        setScannerInstance(new window.jscanify());
      }
      setIsCvLoading(false);
    }
  };

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
        console.error("Gagal membuka kamera:", err);
        alert("Gagal mengakses kamera. Pastikan Anda mengizinkan akses kamera di pengaturan browser Anda.");
        setIsScannerOpen(false);
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
            // Highlight document paper in video feed
            const resultCanvas = scannerInstance.highlightPaper(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(resultCanvas, 0, 0, canvas.width, canvas.height);
          } catch (e) {
            // Fallback: draw raw video if OpenCV / jscanify calculation fails on frame
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        }
      }
      if (isScannerOpen && scanStep === 'scanning') {
        animationFrameId = requestAnimationFrame(processFrame);
      }
    };

    if (isScannerOpen && scanStep === 'scanning' && !isCvLoading && scannerInstance) {
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
  }, [isScannerOpen, scanStep, isCvLoading, scannerInstance]);

  // Capture full uncropped frame from camera
  const handleCapture = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      
      setRawCapturedPhoto(dataUrl);
      setScanStep('cropping');
    } catch (err) {
      console.error("Gagal mengambil foto:", err);
      alert("Gagal mengambil foto. Silakan coba lagi.");
    }
  };

  // Called when rawCapturedPhoto loads inside the crop container
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
          // Normalize coordinates (0 to 1) relative to natural image dimensions
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

    // Fallback: Default bounding box corners (10% padding from edges, normalized)
    setDisplayCorners({
      topLeftCorner: { x: 0.1, y: 0.1 },
      topRightCorner: { x: 0.9, y: 0.1 },
      bottomLeftCorner: { x: 0.1, y: 0.9 },
      bottomRightCorner: { x: 0.9, y: 0.9 }
    });
  };

  // Handle pointer down on a corner marker
  const handlePointerDown = (e, handleName) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    activeHandleRef.current = handleName;
    setActiveHandle(handleName);
  };

  // Handle pointer drag (move) on a corner marker
  const handlePointerMove = (e, handleName) => {
    if (activeHandleRef.current !== handleName || !displayCorners) return;
    e.preventDefault();
    
    const container = e.currentTarget.parentElement; // .crop-wrapper
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Constrain the coordinate within container bounds (matching image dimensions)
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));
    
    // Normalize coordinates to 0..1 range
    const normalizedX = rect.width > 0 ? x / rect.width : 0;
    const normalizedY = rect.height > 0 ? y / rect.height : 0;
    
    setDisplayCorners(prev => ({
      ...prev,
      [handleName]: { x: normalizedX, y: normalizedY }
    }));
  };

  // Handle pointer release
  const handlePointerUp = (e, handleName) => {
    if (activeHandleRef.current === handleName) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {}
      activeHandleRef.current = null;
      setActiveHandle(null);
    }
  };

  // Process the custom crop with perspective warp
  const handleCropApply = () => {
    if (!rawCapturedPhoto || !displayCorners || !scannerInstance) return;

    const img = new window.Image();
    img.src = rawCapturedPhoto;
    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // Map normalized coordinates back to natural image resolution
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
        const dataUrl = croppedCanvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        setScanStep('preview');
      } catch (err) {
        console.error("Gagal melakukan cropping manual:", err);
        alert("Gagal memotong gambar. Silakan coba lagi.");
      }
    };
  };

  // Apply filters on captured image using OpenCV.js
  useEffect(() => {
    if (!capturedImage) return;

    if (filterType === 'color') {
      setFilteredImage(capturedImage);
    } else if (filterType === 'bw') {
      if (window.cv && window.cv.Mat) {
        try {
          const img = new window.Image();
          img.src = capturedImage;
          img.onload = () => {
            const src = window.cv.imread(img);
            const dst = new window.cv.Mat();

            // Convert to Grayscale
            window.cv.cvtColor(src, src, window.cv.COLOR_RGBA2GRAY, 0);

            // Adaptive threshold for clean black-and-white scan look
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
            setFilteredImage(tempCanvas.toDataURL('image/png'));

            src.delete();
            dst.delete();
          };
        } catch (e) {
          console.error("Gagal memproses filter OpenCV:", e);
          setFilteredImage(capturedImage);
        }
      } else {
        setFilteredImage(capturedImage);
      }
    }
  }, [capturedImage, filterType]);

  // Save the cropped & filtered image to form state
  const handleSaveScan = () => {
    if (!filteredImage) return;

    const file = dataURLtoFile(filteredImage, 'scanned_invoice.png');
    setScannedFile(file);
    setScannedFileUrl(filteredImage);
    setFileName(file.name);
    setIsScannerOpen(false);
  };

  // Gallery File selection handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScannedFile(file);
      setFileName(file.name);

      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setScannedFileUrl(url);
      } else {
        setScannedFileUrl(null);
      }
    }
  };

  // Remove current scan/upload
  const handleClearAttachment = () => {
    setScannedFile(null);
    setScannedFileUrl(null);
    setFileName('');
  };

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const invoicePayload = {
      ...data,
      items,
      total,
      scannedFile, // actual File object binary for upload
    };

    console.log('Submitting Invoice Payload:', invoicePayload);
    alert('Form submitted! Ready to connect to Firebase / Google Sheets.\n\nCheck console to see the JSON payload!');
  };

  return (
    <>
      <div className="form-container" style={{ display: isScannerOpen ? 'none' : 'block' }}>
        <div className="header">
          <h1>Invoice Submission</h1>
          <p>Please enter your invoice details below</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Client Info Section */}
          <div className="section">
            <h2 className="section-title"><User size={20} /> Data Diri</h2>
            <div className="input-group">
              <label htmlFor="fullName">Nama Lengkap</label>
              <input id="fullName" name="fullName" type="text" placeholder="John Doe" required />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" placeholder="john@email.com" />
              </div>
              <div className="input-group">
                <label htmlFor="phone">Nomor Telepon</label>
                <input id="phone" name="phone" type="tel" placeholder="081234567890" />
              </div>
            </div>
          </div>

          {/* Invoice Info Section */}
          <div className="section">
            <h2 className="section-title"><FileText size={20} /> Invoice Details</h2>
            <div className="grid-2">
              <div className="input-group">
                <label htmlFor="invoiceNumber">Invoice Number</label>
                <input id="invoiceNumber" name="invoiceNumber" type="text" placeholder="INV-2026-001" required />
              </div>
              <div className="input-group">
                <label htmlFor="invoiceDate">Invoice Date</label>
                <input id="invoiceDate" name="invoiceDate" type="date" required />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="section">
            <h2 className="section-title"><Receipt size={20} /> Items</h2>
            {items.map((item) => (
              <div key={item.id} className="item-row">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <input 
                    type="text" 
                    placeholder="Item description" 
                    value={item.name}
                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    min="1"
                    step="any"
                    value={item.qty}
                    onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <input 
                    type="number" 
                    className="no-spin"
                    placeholder="Price" 
                    min="0"
                    value={item.price}
                    onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="button" 
                  className="btn-icon" 
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length === 1}
                  style={{ 
                    opacity: items.length === 1 ? 0.4 : 1, 
                    cursor: items.length === 1 ? 'not-allowed' : 'pointer' 
                  }}
                  title="Remove Item"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            
            <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
              <Plus size={18} /> Add Item
            </button>

            <div className="totals">
              <div className="total-row grand">
                <span>Total Invoice:</span>
                <span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Attachment Section */}
          <div className="section">
            <h2 className="section-title"><UploadCloud size={20} /> Attachment</h2>
            <div className="input-group">
              <label>Upload Invoice File</label>
              
              {!fileName ? (
                <div className="upload-options" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}
                    onClick={handleOpenScanner}
                  >
                    <Camera size={24} style={{ margin: '0 auto' }} />
                    <span>Ambil Foto (Scan)</span>
                  </button>

                  <label className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}>
                    <Image size={24} style={{ margin: '0 auto' }} />
                    <span>Pilih Galeri/PDF</span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange} 
                    />
                  </label>
                </div>
              ) : (
                <div className="scanned-preview-container">
                  {scannedFileUrl ? (
                    <img src={scannedFileUrl} className="scanned-preview-thumb" alt="Preview" />
                  ) : (
                    <div className="scanned-preview-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' }}>
                      <FileText size={28} style={{ color: '#64748b' }} />
                    </div>
                  )}
                  <div className="scanned-preview-info">
                    <span className="scanned-preview-name">{fileName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {scannedFile ? `${(scannedFile.size / 1024).toFixed(1)} KB` : ''}
                    </span>
                  </div>
                  <div className="scanned-preview-actions">
                    <button 
                      type="button" 
                      className="btn-icon" 
                      onClick={handleClearAttachment}
                      title="Hapus Lampiran"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" rows="3" placeholder="Additional notes or payment instructions..."></textarea>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Submit Invoice
          </button>
        </form>
      </div>

      {/* Camera Document Scanner Page */}
      {isScannerOpen && (
        <div className="scanner-page">
          <div className="scanner-page-header">
            <h3><Camera size={20} /> Camera Document Scanner</h3>
            <button 
              type="button" 
              className="scanner-close-btn" 
              onClick={() => setIsScannerOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="scanner-page-body">
            {isCvLoading && (
              <div className="scanner-loading-overlay">
                <Loader2 className="scanner-spinner" size={32} />
                <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>Mengunduh modul OpenCV & Scanner...</p>
              </div>
            )}

            {scanStep === 'scanning' && (
              <div className="scanner-viewport">
                <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
                <canvas ref={canvasRef} className="scanner-canvas-overlay" />
                <div className="scanner-status-toast">
                  Sejajarkan kertas invoice dengan kotak hijau
                </div>
              </div>
            )}

            {scanStep === 'cropping' && (
              <div className="scanner-step-container">
                <div className="scanner-status-toast" style={{ position: 'relative', top: 'auto', marginBottom: '1rem' }}>
                  Geser 4 titik sudut untuk menyesuaikan posisi kertas
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
                    Warna Asli
                  </button>
                  <button 
                    type="button" 
                    className={`filter-btn ${filterType === 'bw' ? 'active' : ''}`}
                    onClick={() => setFilterType('bw')}
                  >
                    <FileText size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Scan (Hitam-Putih)
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
                <Camera size={18} /> Ambil Foto (Scan)
              </button>
            ) : scanStep === 'cropping' ? (
              <>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setScanStep('scanning');
                    setRawCapturedPhoto(null);
                    setDisplayCorners(null);
                  }}
                >
                  <RefreshCw size={16} /> Ulangi Foto
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleCropApply}
                >
                  <Check size={16} /> Potong Kertas
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setScanStep('cropping')}
                >
                  <RefreshCw size={16} /> Ulangi Potong
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSaveScan}
                >
                  <Check size={16} /> Simpan Hasil Scan
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
