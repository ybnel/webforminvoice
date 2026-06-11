import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FileText, Loader2, User, Phone, Mail, Calendar, Banknote, ArrowLeft, Printer, X } from 'lucide-react';

function ReceiptViewer({ documentId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(null);
  const [printCols, setPrintCols] = useState(2);
  const [printImageSize, setPrintImageSize] = useState('medium'); // 'large', 'medium', 'small', 'hide'
  const [printPageBreak, setPrintPageBreak] = useState(true);
  const [showPrintAttachments, setShowPrintAttachments] = useState(true);
  const [showPrintSettingsModal, setShowPrintSettingsModal] = useState(false);

  // Fetch claim data from Firestore
  useEffect(() => {
    const fetchClaim = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "reimbursements", documentId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setClaim(docSnap.data());
        } else {
          setError("Data reimbursement tidak ditemukan.");
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Gagal memuat data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchClaim();
    }
  }, [documentId]);

  // Handle closing modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActivePhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="form-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
        <Loader2 className="scanner-spinner" size={40} style={{ color: 'var(--primary)' }} />
        <p style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Memuat data reimbursement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600' }}>
          {error}
        </div>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Kembali ke Form
        </button>
      </div>
    );
  }

  // Calculate summary by category
  const categorySummary = claim && claim.attachments ? claim.attachments.reduce((acc, att) => {
    const cat = att.category || 'Lainnya';
    if (!acc[cat]) {
      acc[cat] = { total: 0, count: 0 };
    }
    acc[cat].total += parseFloat(att.amount) || 0;
    acc[cat].count += 1;
    return acc;
  }, {}) : {};

  return (
    <div className="form-container receipt-viewer-print">
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }} className="no-print">
        <button type="button" className="btn btn-secondary" onClick={onBack} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Buat Klaim Baru
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setShowPrintSettingsModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto', marginTop: 0 }}>
          <Printer size={16} /> Cetak Bukti
        </button>
      </div>

      {/* Print Settings Modal - Web View Only */}
      {showPrintSettingsModal && createPortal(
        <div className="receipt-modal-overlay no-print" onClick={() => setShowPrintSettingsModal(false)}>
          <div className="receipt-modal-content" style={{ maxWidth: '540px', gap: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="receipt-modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={20} style={{ color: 'var(--primary)' }} />
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Opsi Format Cetak (Hemat Kertas)
                </h4>
              </div>
              <button className="receipt-modal-close-btn" onClick={() => setShowPrintSettingsModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={18} style={{ color: 'var(--text-main)' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Tampilkan / Sembunyikan Lampiran */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Cetak Lampiran Struk</label>
                <select 
                  value={showPrintAttachments ? 'show' : 'hide'} 
                  onChange={(e) => setShowPrintAttachments(e.target.value === 'show')}
                  style={{ 
                    padding: '0.65rem 0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    background: 'white', 
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    outline: 'none',
                    width: '100%'
                  }}
                >
                  <option value="show">Ya (Tampilkan Gambar/Teks Struk)</option>
                  <option value="hide">Tidak (Sembunyikan Semua Struk)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Kolom Lampiran */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', opacity: showPrintAttachments ? 1 : 0.5 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Jumlah Kolom</label>
                  <select 
                    value={printCols} 
                    onChange={(e) => setPrintCols(Number(e.target.value))}
                    disabled={!showPrintAttachments}
                    style={{ 
                      padding: '0.65rem 0.75rem', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)', 
                      background: 'white', 
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      color: 'var(--text-main)',
                      cursor: showPrintAttachments ? 'pointer' : 'not-allowed',
                      outline: 'none'
                    }}
                  >
                    <option value={2}>2 Kolom</option>
                    <option value={3}>3 Kolom (Hemat)</option>
                    <option value={4}>4 Kolom (Sangat Hemat)</option>
                  </select>
                </div>

                {/* Ukuran Gambar Lampiran */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', opacity: showPrintAttachments ? 1 : 0.5 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Ukuran Gambar</label>
                  <select 
                    value={printImageSize} 
                    onChange={(e) => setPrintImageSize(e.target.value)}
                    disabled={!showPrintAttachments}
                    style={{ 
                      padding: '0.65rem 0.75rem', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)', 
                      background: 'white', 
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      color: 'var(--text-main)',
                      cursor: showPrintAttachments ? 'pointer' : 'not-allowed',
                      outline: 'none'
                    }}
                  >
                    <option value="large">Besar (210px)</option>
                    <option value="medium">Sedang (140px)</option>
                    <option value="small">Kecil (90px)</option>
                    <option value="hide">Hanya Info Teks</option>
                  </select>
                </div>
              </div>

              {/* Pemisah Halaman Baru */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', opacity: showPrintAttachments ? 1 : 0.5 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Letak Lampiran Struk</label>
                <select 
                  value={printPageBreak ? 'always' : 'auto'} 
                  onChange={(e) => setPrintPageBreak(e.target.value === 'always')}
                  disabled={!showPrintAttachments}
                  style={{ 
                    padding: '0.65rem 0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    background: 'white', 
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    color: 'var(--text-main)',
                    cursor: showPrintAttachments ? 'pointer' : 'not-allowed',
                    outline: 'none',
                    width: '100%'
                  }}
                >
                  <option value="always">Mulai di Halaman Baru</option>
                  <option value="auto">Gabung Langsung di Bawah Ringkasan</option>
                </select>
              </div>
            </div>


            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowPrintSettingsModal(false)}
                style={{ flex: 1, padding: '0.65rem', margin: 0, fontSize: '0.95rem' }}
              >
                Batal
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => {
                  setShowPrintSettingsModal(false);
                  setTimeout(() => {
                    window.print();
                  }, 250);
                }}
                style={{ flex: 1.5, padding: '0.65rem', margin: 0, fontSize: '0.95rem', background: 'var(--primary)', color: 'white', width: 'auto', marginTop: 0 }}
              >
                Cetak Sekarang
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ color: 'var(--primary)', fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>Bukti Klaim Reimbursement</h1>
        <p style={{ color: 'var(--text-muted)' }}>ID Transaksi: {documentId}</p>
      </div>

      {/* Info Grid */}
      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Data Karyawan */}
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--primary)' }} /> Data Karyawan
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div><strong>Nama:</strong> {claim.fullName}</div>
            {claim.tripPurpose && <div><strong>Keperluan:</strong> {claim.tripPurpose}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} /> {claim.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={14} style={{ color: 'var(--text-muted)' }} /> {claim.phone}
            </div>
          </div>
        </div>

        {/* Detail Klaim */}
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} /> Detail Klaim
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            {claim.invoiceNumber && <div><strong>Invoice Number:</strong> {claim.invoiceNumber}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} /> <strong>Tanggal Perjalanan:</strong> &nbsp;{claim.tripDate || claim.invoiceDate}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: '700', fontSize: '1rem', marginTop: '0.25rem' }}>
              <Banknote size={16} /> Rp {claim.totalAmount.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Rincian Pengeluaran Table */}
      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2.5rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <FileText size={18} style={{ color: 'var(--primary)' }} /> Rincian Pengeluaran
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontWeight: '600' }}>
              <th style={{ padding: '0.75rem 0.5rem', width: '50px' }}>No</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Tanggal</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Kategori</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>No. Invoice</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Nominal</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '100px' }} className="no-print">Bukti</th>
            </tr>
          </thead>
          <tbody>
            {claim.attachments && claim.attachments.map((att, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>{idx + 1}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{att.invoiceDate || '-'}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span style={{
                    background: 'rgba(79, 70, 229, 0.1)',
                    color: 'var(--primary)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {att.category || 'Lainnya'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{att.invoiceNumber || '-'}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: '600' }}>
                  Rp {(att.amount || 0).toLocaleString('id-ID')}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }} className="no-print">
                  {att.url ? (
                    <img
                      src={att.url}
                      alt="Thumbnail"
                      onClick={() => setActivePhoto(att)}
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'block',
                        margin: '0 auto',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Box */}
      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2.5rem', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <Banknote size={18} style={{ color: 'var(--primary)' }} /> Ringkasan per Kategori (Summary)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.keys(categorySummary).map((cat) => (
            <div key={cat} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                Rp {categorySummary[cat].total.toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {categorySummary[cat].count} Struk/Kuitansi
              </span>
            </div>
          ))}
          {/* Grand Total Card */}
          <div className="grand-total-card" style={{ background: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06)' }}>
            <span className="grand-total-label" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total</span>
            <span className="grand-total-amount" style={{ fontSize: '1.2rem', fontWeight: '800' }}>
              Rp {claim.totalAmount.toLocaleString('id-ID')}
            </span>
            <span className="grand-total-count" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              Total {claim.attachments ? claim.attachments.length : 0} Struk
            </span>
          </div>
        </div>
      </div>

      {/* Print-Only Receipts Attachments Section (Visible ONLY in printed PDF/paper) */}
      {showPrintAttachments && (
        <div className="only-print" style={{ 
          marginTop: printPageBreak ? '3rem' : '1.5rem', 
          pageBreakBefore: printPageBreak ? 'always' : 'auto',
          breakBefore: printPageBreak ? 'page' : 'auto',
          borderTop: printPageBreak ? 'none' : '1px dashed #ccc',
          paddingTop: printPageBreak ? '0' : '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', borderBottom: '1px solid black', paddingBottom: '0.5rem' }}>
            Lampiran Bukti Struk Kuitansi
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${printCols}, 1fr)`, 
            gap: '1rem' 
          }}>
            {claim.attachments && claim.attachments.map((att, idx) => (
              <div key={idx} style={{ 
                pageBreakInside: 'avoid', 
                breakInside: 'avoid', 
                border: '1px solid #ccc', 
                padding: printImageSize === 'small' || printImageSize === 'hide' ? '0.5rem' : '0.85rem', 
                borderRadius: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.35rem', 
                background: 'white' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '700' }}>
                  <span>{idx + 1}. {att.category || 'Lainnya'}</span>
                  <span style={{ color: 'var(--primary)' }}>Rp {(att.amount || 0).toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569' }}>
                  <div>No: {att.invoiceNumber || '-'}</div>
                  <div>Tgl: {att.invoiceDate || '-'}</div>
                </div>
                {printImageSize !== 'hide' && att.url && (
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '0.25rem', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: printImageSize === 'large' ? '220px' : printImageSize === 'medium' ? '150px' : '100px', 
                    background: '#f8fafc', 
                    borderRadius: '4px', 
                    border: '1px solid #eee' 
                  }}>
                    <img
                      src={att.url}
                      alt={att.name}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: printImageSize === 'large' ? '210px' : printImageSize === 'medium' ? '140px' : '90px', 
                        objectFit: 'contain' 
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal Popup (Web only, overlayed) */}
      {activePhoto && createPortal(
        <div className="receipt-modal-overlay no-print" onClick={() => setActivePhoto(null)}>
          <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Detail Bukti Kuitansi
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activePhoto.category} {activePhoto.invoiceNumber ? `(${activePhoto.invoiceNumber})` : ''}
                </span>
              </div>
              <button className="receipt-modal-close-btn" onClick={() => setActivePhoto(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={18} style={{ color: 'var(--text-main)' }} />
              </button>
            </div>
            
            <div style={{ fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div><strong>Tanggal Struk:</strong> {activePhoto.invoiceDate || '-'}</div>
              <div style={{ color: 'var(--primary)', fontWeight: '700' }}>
                <strong>Nominal:</strong> Rp {(activePhoto.amount || 0).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="receipt-modal-img-container">
              <img
                src={activePhoto.url}
                alt={activePhoto.name}
                className="receipt-modal-img"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ReceiptViewer;
