import React, { useState } from 'react';
import { Trash2, UploadCloud, FileText, User, Camera, Image, Crop, Loader2 } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function InvoiceForm({
  attachments = [],
  onOpenScanner,
  onFileChange,
  onOpenEditor,
  onRemoveAttachment,
  onCategoryChange,
  onClearAttachments
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (attachments.length === 0) {
      alert("Harap unggah minimal 1 struk/bukti kuitansi.");
      return;
    }

    const missingCategory = attachments.some(att => !att.category);
    if (missingCategory) {
      alert("Harap pilih kategori untuk semua struk yang diunggah.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('Mengunggah berkas struk ke Firebase Storage...');

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const data = Object.fromEntries(formData.entries());

    try {
      // 1. Upload all attachments to Firebase Storage
      const uploadPromises = attachments.map(async (att) => {
        const fileExtension = att.file.name.split('.').pop() || 'png';
        const storagePath = `reimbursements/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;
        const storageRef = ref(storage, storagePath);
        
        await uploadBytes(storageRef, att.file);
        const downloadUrl = await getDownloadURL(storageRef);
        
        return {
          name: att.name,
          size: att.size,
          category: att.category,
          url: downloadUrl
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // 2. Save structured record to Cloud Firestore
      setSubmitStatus('Menyimpan data klaim ke Firestore...');
      const docRef = await addDoc(collection(db, "reimbursements"), {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        totalAmount: parseFloat(data.totalAmount) || 0,
        attachments: uploadedFiles,
        createdAt: new Date()
      });

      console.log("Document written with ID: ", docRef.id);

      // 3. Send data to Google Sheets via Webhook
      const webhookUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
      if (webhookUrl && webhookUrl !== 'YOUR_GOOGLE_SHEETS_WEBHOOK_URL' && webhookUrl.trim() !== '') {
        setSubmitStatus('Mencatat klaim ke Google Sheets...');
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fullName: data.fullName,
              email: data.email,
              phone: data.phone,
              invoiceNumber: data.invoiceNumber,
              invoiceDate: data.invoiceDate,
              totalAmount: parseFloat(data.totalAmount) || 0,
              attachments: uploadedFiles.map(f => ({ name: f.name, category: f.category, url: f.url }))
            })
          });
        } catch (sheetError) {
          console.error("Gagal mengirim ke Google Sheets:", sheetError);
        }
      }

      alert(
        'Klaim reimbursement berhasil dikirim!\n' +
        `Total: Rp ${(parseFloat(data.totalAmount) || 0).toLocaleString('id-ID')}\n` +
        `Data tersimpan di Firebase & Google Sheets.`
      );

      // Reset form and attachments
      formElement.reset();
      onClearAttachments();

    } catch (error) {
      console.error("Submission error:", error);
      alert("Terjadi kesalahan saat mengirim data. Silakan coba lagi.\n\nDetail: " + error.message);
    } finally {
      setIsSubmitting(false);
      setSubmitStatus('');
    }
  };

  return (
    <div className="form-container" style={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {isSubmitting && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          zIndex: 100,
          borderRadius: '16px'
        }}>
          <Loader2 className="scanner-spinner" size={40} style={{ color: 'var(--primary)' }} />
          <p style={{ fontWeight: '600', color: 'var(--text-main)', textAlign: 'center', padding: '0 1rem' }}>
            {submitStatus}
          </p>
        </div>
      )}

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
            <input id="fullName" name="fullName" type="text" placeholder="John Doe" required disabled={isSubmitting} />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="john@email.com" required disabled={isSubmitting} />
            </div>
            <div className="input-group">
              <label htmlFor="phone">Nomor Telepon</label>
              <input id="phone" name="phone" type="tel" placeholder="081234567890" required disabled={isSubmitting} />
            </div>
          </div>
        </div>

        {/* Invoice Info Section */}
        <div className="section">
          <h2 className="section-title"><FileText size={20} /> Invoice Details</h2>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="invoiceNumber">Invoice Number</label>
              <input id="invoiceNumber" name="invoiceNumber" type="text" placeholder="INV-2026-001" required disabled={isSubmitting} />
            </div>
            <div className="input-group">
              <label htmlFor="invoiceDate">Invoice Date</label>
              <input id="invoiceDate" name="invoiceDate" type="date" required disabled={isSubmitting} />
            </div>
          </div>
          <div className="input-group" style={{ marginTop: '0.5rem' }}>
            <label htmlFor="totalAmount">Total Nominal (Rp)</label>
            <input
              id="totalAmount"
              name="totalAmount"
              type="number"
              className="no-spin"
              placeholder="Masukkan total nominal struk/invoice"
              min="0"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Attachment Section */}
        <div className="section">
          <h2 className="section-title"><UploadCloud size={20} /> Attachment</h2>
          <div className="input-group">
            <label>Upload Invoice File</label>

            <div className="upload-options" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}
                onClick={onOpenScanner}
                disabled={isSubmitting}
              >
                <Camera size={24} style={{ margin: '0 auto' }} />
                <span>Ambil Foto (Scan)</span>
              </button>

              <label className={`btn btn-secondary ${isSubmitting ? 'disabled' : ''}`} style={{ flex: 1, textAlign: 'center', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500', opacity: isSubmitting ? 0.6 : 1 }}>
                <Image size={24} style={{ margin: '0 auto' }} />
                <span>Pilih Galeri</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={onFileChange}
                  disabled={isSubmitting}
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {attachments.map((att) => (
                  <div key={att.id} className="scanned-preview-container" style={{ marginTop: 0 }}>
                    {att.url ? (
                      <img src={att.url} className="scanned-preview-thumb" alt="Preview" />
                    ) : (
                      <div className="scanned-preview-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' }}>
                        <FileText size={28} style={{ color: '#64748b' }} />
                      </div>
                    )}
                    <div className="scanned-preview-info">
                      <span className="scanned-preview-name">{att.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}
                      </span>
                      
                      {/* Attachment Category Dropdown */}
                      <div className="input-group" style={{ marginBottom: 0, marginTop: '0.5rem', maxWidth: '200px' }}>
                        <select
                          value={att.category}
                          onChange={(e) => onCategoryChange(att.id, e.target.value)}
                          required
                          disabled={isSubmitting}
                          style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                        >
                          <option value="" disabled>-- Pilih Kategori --</option>
                          <option value="Tiket">Tiket</option>
                          <option value="Makanan">Makanan</option>
                          <option value="Transportasi">Transportasi</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    </div>
                    <div className="scanned-preview-actions">
                      <button
                        type="button"
                        className="btn-icon-secondary"
                        onClick={() => onOpenEditor(att)}
                        title="Potong & Rapikan"
                        disabled={isSubmitting}
                      >
                        <Crop size={20} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => onRemoveAttachment(att.id)}
                        title="Hapus Lampiran"
                        disabled={isSubmitting}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          Submit Invoice
        </button>
      </form>
    </div>
  );
}

export default InvoiceForm;
