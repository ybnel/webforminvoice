import React, { useState, useEffect } from 'react';
import InvoiceForm from './components/InvoiceForm';
import DocumentScanner from './components/DocumentScanner';
import ReceiptViewer from './components/ReceiptViewer';

function App() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [editAttachment, setEditAttachment] = useState(null);
  const [viewDocumentId, setViewDocumentId] = useState(null);
  const [pendingUploadDate, setPendingUploadDate] = useState('');

  // Check URL parameters for ?view=DOC_ID on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    if (viewId) {
      setViewDocumentId(viewId);
    }
  }, []);

  const handleBackToForm = () => {
    // Clear query parameter in browser history
    window.history.pushState({}, '', window.location.pathname);
    setViewDocumentId(null);
  };

  const handleOpenScanner = (defaultDate = '') => {
    if (attachments.length >= 15) {
      alert("Batas maksimal 15 lampiran struk telah tercapai. Harap kirim pengajuan ini terlebih dahulu atau hapus lampiran yang tidak diperlukan.");
      return;
    }
    setPendingUploadDate(defaultDate);
    setEditAttachment(null);
    setUploadQueue([]);
    setIsScannerOpen(true);
  };  

  const handleFileChange = (e, defaultDate = '') => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    if (attachments.length + imageFiles.length > 15) {
      alert(`Maksimal berkas struk yang dapat dilampirkan adalah 15. Anda mencoba menambahkan ${imageFiles.length} foto, sedangkan lampiran saat ini sudah ada ${attachments.length} foto.`);
      e.target.value = '';
      return;
    }

    setPendingUploadDate(defaultDate);
    setEditAttachment(null);
    setUploadQueue(imageFiles);
    setIsScannerOpen(true);
    e.target.value = '';
  };

  const handleOpenEditorForAttachment = (att) => {
    setUploadQueue([]);
    setEditAttachment(att);
    setIsScannerOpen(true);
  };

  const handleSaveScan = (newAttachment) => {
    if (attachments.length >= 15) {
      alert("Batas maksimal 15 lampiran telah tercapai. Struk tambahan tidak dapat disimpan.");
      return;
    }
    setAttachments(prev => [...prev, { 
      ...newAttachment, 
      category: '', 
      description: '', 
      invoiceDate: pendingUploadDate 
    }]);
  };

  const handleSaveEdit = (updatedAttachment) => {
    setAttachments(prev => prev.map(att => att.id === updatedAttachment.id ? { ...att, ...updatedAttachment } : att));
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(prev => {
      const target = prev.find(att => att.id === id);
      if (target && target.url && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter(att => att.id !== id);
    });
  };

  const handleAttachmentFieldChange = (id, field, value) => {
    setAttachments(prev => prev.map(att =>
      att.id === id ? { ...att, [field]: value } : att
    ));
  };

  const handleClearAttachments = () => {
    attachments.forEach(att => {
      if (att.url && att.url.startsWith('blob:')) {
        URL.revokeObjectURL(att.url);
      }
    });
    setAttachments([]);
  };

  if (viewDocumentId) {
    return <ReceiptViewer documentId={viewDocumentId} onBack={handleBackToForm} />;
  }

  return (
    <>
      <div style={{ display: isScannerOpen ? 'none' : 'block' }}>
        <InvoiceForm
          attachments={attachments}
          onOpenScanner={handleOpenScanner}
          onFileChange={handleFileChange}
          onOpenEditor={handleOpenEditorForAttachment}
          onRemoveAttachment={handleRemoveAttachment}
          onFieldChange={handleAttachmentFieldChange}
          onClearAttachments={handleClearAttachments}
        />
      </div>

      {isScannerOpen && (
        <DocumentScanner
          initialQueue={uploadQueue}
          editAttachment={editAttachment}
          onClose={() => setIsScannerOpen(false)}
          onSaveScan={handleSaveScan}
          onSaveEdit={handleSaveEdit}
        />
      )}
    </>
  );
}

export default App;
