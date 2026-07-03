import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FileText, Loader2, User, Phone, Mail, Calendar, Banknote, ArrowLeft, Printer, X, Landmark, Briefcase } from 'lucide-react';

function ReceiptViewer({ documentId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(null);
  const [printCols, setPrintCols] = useState(2);
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
          setError("Reimbursement claim details not found.");
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load details: " + err.message);
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
        <p style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Loading reimbursement details...</p>
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
          <ArrowLeft size={16} /> Back to Form
        </button>
      </div>
    );
  }

  // Calculate summary by category
  const categorySummary = claim && claim.attachments ? claim.attachments.reduce((acc, att) => {
    const cat = att.category || 'Others';
    if (!acc[cat]) {
      acc[cat] = { total: 0, count: 0 };
    }
    acc[cat].total += parseFloat(att.amount) || 0;
    acc[cat].count += 1;
    return acc;
  }, {}) : {};

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fef3c7', text: '#d97706', border: 'rgba(217, 119, 6, 0.15)' };
      case 'Approved': return { bg: '#d1fae5', text: '#059669', border: 'rgba(5, 150, 105, 0.15)' };
      case 'Reimbursed': return { bg: '#dbeafe', text: '#2563eb', border: 'rgba(37, 99, 235, 0.15)' };
      case 'Rejected': return { bg: '#fee2e2', text: '#dc2626', border: 'rgba(220, 38, 38, 0.15)' };
      default: return { bg: '#f1f5f9', text: '#475569', border: 'rgba(71, 85, 105, 0.15)' };
    }
  };

  const badge = getStatusBadgeStyles(claim.status || 'Pending');

  return (
    <div className="form-container receipt-viewer-print">
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }} className="no-print">
        <button type="button" className="btn btn-secondary" onClick={onBack} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> New Claim Submission
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setShowPrintSettingsModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto', marginTop: 0 }}>
          <Printer size={16} /> Print Claim Receipt
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
                  Print Format Settings (Eco-Paper Saving)
                </h4>
              </div>
              <button className="receipt-modal-close-btn" onClick={() => setShowPrintSettingsModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={18} style={{ color: 'var(--text-main)' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Tampilkan / Sembunyikan Lampiran */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Print Attached Receipts</label>
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
                  <option value="show">Yes (Show receipt images & texts)</option>
                  <option value="hide">No (Hide receipts in printout)</option>
                </select>
              </div>

              {/* Kolom Lampiran */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', opacity: showPrintAttachments ? 1 : 0.5 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Columns Per Page</label>
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
                    outline: 'none',
                    width: '100%'
                  }}
                >
                  <option value={2}>2 Columns (Default)</option>
                  <option value={3}>3 Columns (Eco Saving)</option>
                  <option value={4}>4 Columns (Maximum Saving)</option>
                </select>
              </div>

              {/* Pemisah Halaman Baru */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', opacity: showPrintAttachments ? 1 : 0.5 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Receipt Sections Placement</label>
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
                  <option value="always">Start on a New Page</option>
                  <option value="auto">Place Directly below Summary</option>
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
                Cancel
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
                Print Now
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary)', fontWeight: '700', marginBottom: '0.5rem' }}>Expense Claim Details</h1>
        <p style={{ color: 'var(--text-muted)' }}>Claim ID: {documentId}</p>
      </div>

      {/* Info Grid */}
      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Employee Info */}
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--primary)' }} /> Employee Profile
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
            <div><strong>Name:</strong> {claim.fullName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Landmark size={14} style={{ color: 'var(--text-muted)' }} /> <strong>Office Branch:</strong> {claim.costCenter || 'N/A'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Briefcase size={14} style={{ color: 'var(--text-muted)' }} /> <strong>Job Title:</strong> {claim.jobTitle || 'N/A'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} /> {claim.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={14} style={{ color: 'var(--text-muted)' }} /> {claim.phone}
            </div>
          </div>
        </div>

        {/* Claim Info */}
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} /> Claim Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
            {claim.tripPurpose && <div><strong>Purpose:</strong> {claim.tripPurpose}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} /> <strong>Trip Period:</strong> &nbsp;
              {claim.tripStartDate && claim.tripEndDate ? (
                `${claim.tripStartDate} to ${claim.tripEndDate}`
              ) : (
                claim.tripDate || claim.invoiceDate
              )}
            </div>
            
            {/* Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
              <strong>Status:</strong> &nbsp;
              <span style={{
                background: badge.bg,
                color: badge.text,
                border: `1px solid ${badge.border}`,
                padding: '0.25rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                display: 'inline-block'
              }}>
                {claim.status || 'Pending'}
              </span>
            </div>

            {claim.allowance !== undefined ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Banknote size={14} style={{ color: 'var(--text-muted)' }} /> <strong>Allowance Limit:</strong> &nbsp;Rp {claim.allowance.toLocaleString('id-ID')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Banknote size={14} style={{ color: 'var(--text-muted)' }} /> <strong>Total Claimed:</strong> &nbsp;Rp {claim.totalAmount.toLocaleString('id-ID')}
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  color: claim.remainingAllowance < 0 ? 'var(--danger)' : 'var(--primary)', 
                  fontWeight: '700', 
                  fontSize: '1rem', 
                  marginTop: '0.25rem' 
                }}>
                  <Banknote size={16} /> <strong>Remaining Allowance:</strong> &nbsp;Rp {claim.remainingAllowance.toLocaleString('id-ID')}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: '800', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                <Banknote size={18} style={{ color: 'var(--primary)' }} /> Rp {claim.totalAmount.toLocaleString('id-ID')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rincian Pengeluaran Table */}
      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2.5rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <FileText size={18} style={{ color: 'var(--primary)' }} /> Expense Breakdown
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontWeight: '600' }}>
              <th style={{ padding: '0.75rem 0.5rem', width: '50px' }}>No</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Description</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '100px' }} className="no-print">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {claim.attachments && claim.attachments.map((att, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>{idx + 1}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{att.invoiceDate || '-'}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{
                      background: 'rgba(79, 70, 229, 0.1)',
                      color: 'var(--primary)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      alignSelf: 'flex-start'
                    }}>
                      {att.category || 'Others'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500', marginLeft: '0.25rem' }}>
                      {att.numberOfPersons || 1} pax
                    </span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{att.description || att.invoiceNumber || '-'}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
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
      <div className="summary-box-container" style={{ 
        background: 'white', 
        padding: '1.25rem', 
        borderRadius: '12px', 
        border: '1px solid var(--border)', 
        marginBottom: '2.5rem', 
        pageBreakInside: 'avoid', 
        breakInside: 'avoid',
        pageBreakBefore: 'always',
        breakBefore: 'page'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <Banknote size={18} style={{ color: 'var(--primary)' }} /> Summary by Category
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.keys(categorySummary).map((cat) => (
            <div key={cat} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                Rp {categorySummary[cat].total.toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {categorySummary[cat].count} Receipt(s)
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
          {/* Sisa Uang Saku Card */}
          {claim.allowance !== undefined && (
            <div className={`sisa-allowance-card ${claim.remainingAllowance < 0 ? 'over-budget' : 'under-budget'}`} style={{ 
              background: claim.remainingAllowance < 0 ? '#ef4444' : '#10b981', 
              color: 'white', 
              padding: '1rem', 
              borderRadius: '10px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.25rem', 
              boxShadow: claim.remainingAllowance < 0 ? '0 4px 6px -1px rgba(239, 68, 68, 0.1), 0 2px 4px -1px rgba(239, 68, 68, 0.06)' : '0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06)'
            }}>
              <span className="sisa-allowance-label" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {claim.remainingAllowance < 0 ? 'Reimbursement Due' : 'Refund to Company'}
              </span>
              <span className="sisa-allowance-amount" style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                Rp {Math.abs(claim.remainingAllowance).toLocaleString('id-ID')}
              </span>
              <span className="sisa-allowance-count" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                {claim.remainingAllowance < 0 ? 'To be paid to employee' : 'To be returned by employee'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Print-Only Receipts Attachments Section */}
      {showPrintAttachments && (
        <div className="only-print" style={{ 
          marginTop: printPageBreak ? '3rem' : '1.5rem', 
          pageBreakBefore: printPageBreak ? 'always' : 'auto',
          breakBefore: printPageBreak ? 'page' : 'auto',
          borderTop: printPageBreak ? 'none' : '1px dashed #ccc',
          paddingTop: printPageBreak ? '0' : '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', borderBottom: '1px solid black', paddingBottom: '0.5rem' }}>
            Attached Receipts Supporting Documents
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
                padding: '0.85rem', 
                borderRadius: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.35rem', 
                background: 'white' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '700' }}>
                  <span>{idx + 1}. {att.category || 'Others'} ({att.numberOfPersons || 1} pax)</span>
                  <span style={{ color: 'var(--primary)' }}>Rp {(att.amount || 0).toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569' }}>
                  <div>Desc: {att.description || att.invoiceNumber || '-'}</div>
                  <div>Date: {att.invoiceDate || '-'}</div>
                </div>
                {att.url && (
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '0.35rem', 
                    borderRadius: '4px', 
                    border: '1px solid #eee',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={att.url}
                      alt={att.name}
                      style={{ 
                        width: '100%', 
                        height: 'auto', 
                        display: 'block'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal Popup (Web only) */}
      {activePhoto && createPortal(
        <div className="receipt-modal-overlay no-print" onClick={() => setActivePhoto(null)}>
          <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Receipt Attachment Preview
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activePhoto.category} ({activePhoto.numberOfPersons || 1} pax) {(activePhoto.description || activePhoto.invoiceNumber) ? ` - ${activePhoto.description || activePhoto.invoiceNumber}` : ''}
                </span>
              </div>
              <button className="receipt-modal-close-btn" onClick={() => setActivePhoto(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={18} style={{ color: 'var(--text-main)' }} />
              </button>
            </div>
            
            <div style={{ fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div><strong>Date:</strong> {activePhoto.invoiceDate || '-'}</div>
              <div style={{ color: 'var(--primary)', fontWeight: '700' }}>
                <strong>Amount:</strong> Rp {(activePhoto.amount || 0).toLocaleString('id-ID')}
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
