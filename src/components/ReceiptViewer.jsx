import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FileText, Loader2, User, Phone, Mail, Calendar, Banknote, ArrowLeft, Printer } from 'lucide-react';

function ReceiptViewer({ documentId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState('');

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

  return (
    <div className="form-container receipt-viewer-print">
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }} className="no-print">
        <button type="button" className="btn btn-secondary" onClick={onBack} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Buat Klaim Baru
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto', marginTop: 0 }}>
          <Printer size={16} /> Cetak Bukti
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ color: 'var(--primary)', fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>Bukti Klaim</h1>
        <p style={{ color: 'var(--text-muted)' }}>ID Transaksi: {documentId}</p>
      </div>

      {/* Info Grid */}
      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Data Diri */}
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

      {/* Receipts Attachments */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          Lampiran Struk ({claim.attachments ? claim.attachments.length : 0})
        </h3>
        {claim.attachments && claim.attachments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {claim.attachments.map((att, idx) => (
              <div key={idx} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{idx + 1}. {att.name}</span>
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                    Kategori: {att.category}
                  </span>
                </div>
                
                {/* Detail Struk */}
                {(att.invoiceNumber || att.invoiceDate || att.amount !== undefined) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    {att.invoiceNumber && <div><strong>No. Invoice:</strong> &nbsp;{att.invoiceNumber}</div>}
                    {att.invoiceDate && <div><strong>Tanggal Struk:</strong> &nbsp;{att.invoiceDate}</div>}
                    {att.amount !== undefined && (
                      <div style={{ color: 'var(--primary)', fontWeight: '700' }}>
                        <strong>Nominal:</strong> &nbsp;Rp {att.amount.toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                )}

                {att.url && (
                  <div style={{ textAlign: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <img
                      src={att.url}
                      alt={att.name}
                      style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>Tidak ada struk terlampir.</p>
        )}
      </div>
    </div>
  );
}

export default ReceiptViewer;
