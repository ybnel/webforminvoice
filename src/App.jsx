import React, { useState, useEffect } from 'react';
import InvoiceForm from './components/InvoiceForm';
import DocumentScanner from './components/DocumentScanner';
import ReceiptViewer from './components/ReceiptViewer';
import AdminDashboard from './components/AdminDashboard';
import Logo from './components/Logo';
import { ShieldCheck, Loader2 } from 'lucide-react';

import { processIncomingUploadFiles } from './utils/pdfConverter';

const ADMIN_PIN = '1234'; // Default PIN to access Admin Dashboard

function App() {
  const [isAdminPage, setIsAdminPage] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [editAttachment, setEditAttachment] = useState(null);
  const [viewDocumentId, setViewDocumentId] = useState(null);
  const [pendingUploadDate, setPendingUploadDate] = useState('');

  // Detect URL parameter and verify admin session on mount / URL change
  useEffect(() => {
    const checkParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const viewId = urlParams.get('view') || urlParams.get('doc');
      const adminParam = urlParams.get('admin');
      
      if (viewId) {
        setViewDocumentId(viewId);
      } else {
        setViewDocumentId(null);
      }

      if (adminParam === 'true') {
        setIsAdminPage(true);
        const sessionAuth = sessionStorage.getItem('admin_authenticated') === 'true';
        setIsAdminAuthenticated(sessionAuth);
      } else {
        setIsAdminPage(false);
      }
    };

    checkParams();
    window.addEventListener('popstate', checkParams);
    return () => window.removeEventListener('popstate', checkParams);
  }, []);

  const handleAdminVerifyPin = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      sessionStorage.setItem('admin_authenticated', 'true');
      setIsAdminAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
      setPinInput('');
    }
  };

  const handleAdminSignOut = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAdminAuthenticated(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    window.history.pushState({}, '', url);
    setIsAdminPage(false);
  };

  const handleBackToForm = () => {
    window.history.pushState({}, '', window.location.pathname);
    setViewDocumentId(null);
  };

  const handleOpenScanner = (defaultDate = '') => {
    if (attachments.length >= 15) {
      alert("Maximum limit of 15 attachments reached. Please submit this claim first or delete unused files.");
      return;
    }
    setPendingUploadDate(defaultDate);
    setEditAttachment(null);
    setUploadQueue([]);
    setIsScannerOpen(true);
  };  

  const handleFileChange = async (e, defaultDate = '') => {
    const rawFiles = Array.from(e.target.files);
    if (rawFiles.length === 0) return;

    // Filter valid files (images + PDFs)
    const validFiles = rawFiles.filter(f => 
      (f.type && (f.type.startsWith('image/') || f.type === 'application/pdf')) || 
      (f.name && f.name.match(/\.(png|jpe?g|webp|bmp|gif|heic|heif|pdf)$/i))
    );

    if (validFiles.length === 0) return;

    // Process & convert any PDFs into image files
    let processedFiles = validFiles;
    const hasPdf = validFiles.some(f => f.type === 'application/pdf' || (f.name && f.name.toLowerCase().endsWith('.pdf')));
    if (hasPdf) {
      try {
        processedFiles = await processIncomingUploadFiles(validFiles);
      } catch (err) {
        console.error("PDF conversion error:", err);
      }
    }

    if (attachments.length + processedFiles.length > 15) {
      alert(`Maximum attachments limit is 15. You tried to add ${processedFiles.length} item(s), but you already have ${attachments.length} attached.`);
      e.target.value = '';
      return;
    }

    setPendingUploadDate(defaultDate);
    setEditAttachment(null);
    setUploadQueue(processedFiles);
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
      alert("Maximum limit of 15 attachments reached. Additional receipt cannot be saved.");
      return;
    }
    setAttachments(prev => [...prev, { 
      ...newAttachment, 
      category: '', 
      description: '', 
      invoiceDate: pendingUploadDate,
      numberOfPersons: 1
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

  // If viewing a single claim rekap sheet (?view=DOC_ID)
  if (viewDocumentId) {
    return <ReceiptViewer documentId={viewDocumentId} onBack={handleBackToForm} />;
  }

  // Render Admin Layout
  if (isAdminPage) {
    if (!isAdminAuthenticated) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'radial-gradient(circle at 10% 20%, rgb(241, 245, 249) 0%, rgb(226, 232, 240) 100%)',
          padding: '1.5rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            <div style={{
              background: 'rgba(79, 70, 229, 0.08)',
              padding: '1rem',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Logo size={48} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                Admin Portal Gate
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Please enter the security PIN to manage reimbursement claims.
              </p>
            </div>

            {pinError && (
              <div style={{
                width: '100%',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#ef4444',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: '500',
                textAlign: 'left'
              }}>
                {pinError}
              </div>
            )}

            <form onSubmit={handleAdminVerifyPin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="password"
                placeholder="Enter PIN (e.g., 1234)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  textAlign: 'center',
                  letterSpacing: '0.25em',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  width: '100%',
                  background: 'var(--primary, #4f46e5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#4f46e5'}
              >
                Verify PIN
              </button>
            </form>
          </div>
        </div>
      );
    }

    return <AdminDashboard onSignOut={handleAdminSignOut} />;
  }

  // Render Employee Layout (No login required)
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', width: '100%' }}>
      <div style={{ display: isScannerOpen ? 'none' : 'block', padding: '1rem 0' }}>
        <InvoiceForm
          attachments={attachments}
          setAttachments={setAttachments}
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
    </div>
  );
}

export default App;
