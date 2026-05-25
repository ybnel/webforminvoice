import React, { useState } from 'react';
import InvoiceForm from './components/InvoiceForm';
import DocumentScanner from './components/DocumentScanner';

function App() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [editAttachment, setEditAttachment] = useState(null);

  const handleOpenScanner = () => {
    setEditAttachment(null);
    setUploadQueue([]);
    setIsScannerOpen(true);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

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
    setAttachments(prev => [...prev, { ...newAttachment, category: '' }]);
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

  const handleAttachmentCategoryChange = (id, category) => {
    setAttachments(prev => prev.map(att =>
      att.id === id ? { ...att, category } : att
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

  return (
    <>
      <div style={{ display: isScannerOpen ? 'none' : 'block' }}>
        <InvoiceForm
          attachments={attachments}
          onOpenScanner={handleOpenScanner}
          onFileChange={handleFileChange}
          onOpenEditor={handleOpenEditorForAttachment}
          onRemoveAttachment={handleRemoveAttachment}
          onCategoryChange={handleAttachmentCategoryChange}
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
