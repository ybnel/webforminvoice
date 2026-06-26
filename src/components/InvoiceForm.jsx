import React, { useState, useRef } from 'react';
import { Trash2, UploadCloud, FileText, User, Camera, Image, Crop, Loader2, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// Helper function to read file as Base64 Data URL
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

function InvoiceForm({
  attachments = [],
  onOpenScanner,
  onFileChange,
  onOpenEditor,
  onRemoveAttachment,
  onFieldChange,
  onClearAttachments
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  
  // Date modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [uploadAction, setUploadAction] = useState(null); // 'camera' | 'gallery'

  const fileInputRef = useRef(null);

  // Calculate total amount automatically
  const totalAmount = attachments.reduce((sum, att) => sum + (parseFloat(att.amount) || 0), 0);

  const getDateRange = (start, end) => {
    const dates = [];
    if (!start || !end) return dates;
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0,0,0,0);
    e.setHours(0,0,0,0);
    if (s > e) return dates;
    
    const cur = new Date(s);
    while (cur <= e) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  };

  const handleInitiateUpload = (action) => {
    if (!tripStartDate || !tripEndDate) {
      alert("Harap isi Tanggal Pergi dan Tanggal Pulang terlebih dahulu.");
      return;
    }
    const dates = getDateRange(tripStartDate, tripEndDate);
    if (dates.length === 0) {
      alert("Rentang tanggal perjalanan dinas tidak valid.");
      return;
    }
    setSelectedDate(dates[0]); // default to first day
    setUploadAction(action);
    setShowDateModal(true);
  };

  const handleConfirmUpload = () => {
    setShowDateModal(false);
    if (uploadAction === 'camera') {
      onOpenScanner(selectedDate);
    } else if (uploadAction === 'gallery') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (attachments.length === 0) {
      alert("Harap unggah minimal 1 struk/bukti kuitansi.");
      return;
    }

    const missingDetails = attachments.some(att => 
      !att.category || !att.description || !att.invoiceDate || !att.amount
    );
    if (missingDetails) {
      alert("Harap lengkapi semua informasi (Kategori, Keterangan, Tanggal Struk, & Nominal) untuk semua struk yang diunggah.");
      return;
    }

    const invalidAmount = attachments.some(att => parseFloat(att.amount) <= 0 || isNaN(parseFloat(att.amount)));
    if (invalidAmount) {
      alert("Harap masukkan nominal yang valid untuk semua struk.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('Memproses berkas struk ke Base64...');

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const data = Object.fromEntries(formData.entries());

    try {
      // 1. Process files to Base64 strings
      const uploadPromises = attachments.map(async (att) => {
        let base64Url = att.url;
        // If it's a blob URL (un-cropped gallery upload), read the file as Base64
        if (att.url.startsWith('blob:')) {
          base64Url = await fileToBase64(att.file);
        }
        
        return {
          name: att.name,
          size: att.size,
          category: att.category,
          description: att.description,
          invoiceDate: att.invoiceDate,
          amount: parseFloat(att.amount) || 0,
          url: base64Url
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // 2. Save structured record to Cloud Firestore
      setSubmitStatus('Menyimpan data klaim ke Firestore...');
      const docRef = await addDoc(collection(db, "reimbursements"), {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        tripPurpose: data.tripPurpose,
        tripStartDate: tripStartDate,
        tripEndDate: tripEndDate,
        totalAmount: totalAmount,
        attachments: uploadedFiles,
        createdAt: new Date()
      });

      console.log("Document written with ID: ", docRef.id);

      // 3. Send view portal link to Google Sheets via Webhook
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
              tripPurpose: data.tripPurpose,
              description: attachments.map(att => att.description).join(', '), // Combined
              invoiceDate: `${tripStartDate} s/d ${tripEndDate}`,
              totalAmount: totalAmount,
              attachments: [{ 
                category: '', 
                url: `${window.location.origin}/?view=${docRef.id}` 
              }]
            })
          });
        } catch (sheetError) {
          console.error("Gagal mengirim ke Google Sheets:", sheetError);
        }
      }

      alert(
        'Klaim reimbursement berhasil dikirim!\n' +
        `Total Pengeluaran: Rp ${totalAmount.toLocaleString('id-ID')}\n` +
        `Data tersimpan di Firestore & Google Sheets.`
      );

      // Reset form and attachments
      formElement.reset();
      setTripStartDate('');
      setTripEndDate('');
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
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="fullName">Nama Lengkap</label>
              <input id="fullName" name="fullName" type="text" placeholder="Your Name" required disabled={isSubmitting} />
            </div>
            <div className="input-group">
              <label htmlFor="phone">Nomor Telepon</label>
              <input id="phone" name="phone" type="tel" placeholder="081234567890" required disabled={isSubmitting} />
            </div>
          </div>
          <div className="grid-2" style={{ marginTop: '0.5rem' }}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="yourname@email.com" required disabled={isSubmitting} />
            </div>
            <div className="input-group">
              <label htmlFor="tripPurpose">Keperluan / Tujuan Perjalanan</label>
              <input id="tripPurpose" name="tripPurpose" type="text" placeholder="Business trip to Bandung" required disabled={isSubmitting} />
            </div>
          </div>
        </div>

        {/* Invoice Info Section */}
        <div className="section">
          <h2 className="section-title"><FileText size={20} /> Detail Pengajuan</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tripStartDate">Tanggal Pergi</label>
              <input 
                id="tripStartDate" 
                name="tripStartDate" 
                type="date" 
                value={tripStartDate}
                onChange={(e) => {
                  setTripStartDate(e.target.value);
                  if (tripEndDate && e.target.value > tripEndDate) {
                    setTripEndDate('');
                  }
                }}
                required 
                disabled={isSubmitting} 
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tripEndDate">Tanggal Pulang</label>
              <input 
                id="tripEndDate" 
                name="tripEndDate" 
                type="date" 
                value={tripEndDate}
                min={tripStartDate}
                onChange={(e) => setTripEndDate(e.target.value)}
                required 
                disabled={isSubmitting} 
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="totalAmountDisplay">Total Pengeluaran (Rp)</label>
              <input
                id="totalAmountDisplay"
                type="text"
                value={`Rp ${totalAmount.toLocaleString('id-ID')}`}
                readOnly
                disabled={isSubmitting}
                style={{ 
                  background: '#f1f5f9', 
                  cursor: 'not-allowed', 
                  fontWeight: '700', 
                  color: 'var(--primary)' 
                }}
              />
            </div>
          </div>
        </div>

        {/* Attachment Section */}
        <div className="section">
          <h2 className="section-title"><UploadCloud size={20} /> Attachment</h2>
          <div className="input-group">
            <label>Upload Invoice File</label>

            {attachments.length >= 15 ? (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                color: '#991b1b',
                fontSize: '0.85rem',
                fontWeight: '500',
                textAlign: 'center',
                marginTop: '0.5rem'
              }}>
                Batas maksimal 15 lampiran kuitansi telah tercapai. Harap kirim pengajuan ini terlebih dahulu atau hapus lampiran yang tidak diperlukan untuk menambahkan lampiran baru.
              </div>
            ) : (
              <div className="upload-options" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}
                  onClick={() => handleInitiateUpload('camera')}
                  disabled={isSubmitting}
                >
                  <Camera size={24} style={{ margin: '0 auto' }} />
                  <span>Ambil Foto (Scan)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}
                  onClick={() => handleInitiateUpload('gallery')}
                  disabled={isSubmitting}
                >
                  <Image size={24} style={{ margin: '0 auto' }} />
                  <span>Pilih Galeri</span>
                </button>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    onFileChange(e, selectedDate);
                    e.target.value = '';
                  }}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {attachments.map((att) => (
                  <div key={att.id} className="scanned-preview-container" style={{ marginTop: 0, flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                    {/* Top Row: Thumbnail, Name, Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                      {att.url ? (
                        <img src={att.url} className="scanned-preview-thumb" alt="Preview" style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      ) : (
                        <div className="scanned-preview-thumb" style={{ width: '40px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '4px' }}>
                          <FileText size={20} style={{ color: '#64748b' }} />
                        </div>
                      )}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span className="scanned-preview-name" style={{ fontSize: '0.85rem' }}>{att.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}
                        </span>
                      </div>
                      <div className="scanned-preview-actions" style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn-icon-secondary"
                          onClick={() => onOpenEditor(att)}
                          title="Potong & Rapikan"
                          disabled={isSubmitting}
                          style={{ padding: '0.35rem' }}
                        >
                          <Crop size={18} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => onRemoveAttachment(att.id)}
                          title="Hapus Lampiran"
                          disabled={isSubmitting}
                          style={{ padding: '0.35rem' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Inputs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', width: '100%', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      {/* Kategori */}
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: 'var(--text-muted)' }}>Kategori</label>
                        <select
                          value={att.category || ''}
                          onChange={(e) => onFieldChange(att.id, 'category', e.target.value)}
                          required
                          disabled={isSubmitting}
                          style={{ padding: '0.45rem 0.5rem', fontSize: '0.85rem', borderRadius: '6px', height: 'auto', border: '1px solid var(--border)' }}
                        >
                          <option value="" disabled>-- Kategori --</option>
                          <option value="Tiket">Tiket</option>
                          <option value="Makanan">Makanan</option>
                          <option value="Transportasi">Transportasi</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>

                      {/* Keterangan */}
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: 'var(--text-muted)' }}>Keterangan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Makan malam klien"
                          value={att.description || ''}
                          onChange={(e) => onFieldChange(att.id, 'description', e.target.value)}
                          required
                          disabled={isSubmitting}
                          style={{ padding: '0.45rem 0.5rem', fontSize: '0.85rem', borderRadius: '6px', height: 'auto', border: '1px solid var(--border)' }}
                        />
                      </div>

                      {/* Tanggal Struk */}
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: 'var(--text-muted)' }}>Tanggal Struk</label>
                        <select
                          value={att.invoiceDate || ''}
                          onChange={(e) => onFieldChange(att.id, 'invoiceDate', e.target.value)}
                          required
                          disabled={isSubmitting}
                          style={{ padding: '0.45rem 0.5rem', fontSize: '0.85rem', borderRadius: '6px', height: 'auto', border: '1px solid var(--border)' }}
                        >
                          {att.invoiceDate && !getDateRange(tripStartDate, tripEndDate).includes(att.invoiceDate) && (
                            <option value={att.invoiceDate}>{formatDateIndo(att.invoiceDate)}</option>
                          )}
                          {getDateRange(tripStartDate, tripEndDate).map((d) => (
                            <option key={d} value={d}>
                              {formatDateIndo(d)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Nominal */}
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: 'var(--text-muted)' }}>Nominal (Rp)</label>
                        <input
                          type="number"
                          placeholder="150000"
                          className="no-spin"
                          value={att.amount || ''}
                          onChange={(e) => onFieldChange(att.id, 'amount', e.target.value)}
                          required
                          disabled={isSubmitting}
                          style={{ padding: '0.45rem 0.5rem', fontSize: '0.85rem', borderRadius: '6px', height: 'auto', border: '1px solid var(--border)' }}
                        />
                      </div>
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

      {/* Pre-upload Date Selection Modal */}
      {showDateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setShowDateModal(false)}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>Pilih Tanggal Struk</h3>
              <button 
                type="button" 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.25rem' }} 
                onClick={() => setShowDateModal(false)}
              >
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Pilih tanggal pengeluaran untuk struk yang akan Anda unggah:
            </p>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
              >
                {getDateRange(tripStartDate, tripEndDate).map((d) => (
                  <option key={d} value={d}>
                    {formatDateIndo(d)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, margin: 0, padding: '0.65rem' }}
                onClick={() => setShowDateModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, margin: 0, padding: '0.65rem' }}
                onClick={handleConfirmUpload}
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceForm;
