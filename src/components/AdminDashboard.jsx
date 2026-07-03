import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Search, Loader2, FileText, CheckCircle, XCircle, DollarSign, Clock, ExternalLink, LogOut, Landmark } from 'lucide-react';

function AdminDashboard({ onSignOut }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState(null);

  // Realtime claims listener from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reimbursements"), (snapshot) => {
      const allClaims = [];
      snapshot.forEach((doc) => {
        allClaims.push({ id: doc.id, ...doc.data() });
      });

      // Sort by creation date desc
      allClaims.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setClaims(allClaims);
      setLoading(false);
    }, (error) => {
      console.error("Firestore loading error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (claimId, newStatus) => {
    setUpdatingId(claimId);
    try {
      const claimRef = doc(db, "reimbursements", claimId);
      await updateDoc(claimRef, { status: newStatus });
    } catch (err) {
      console.error("Failed to update claim status:", err);
      alert("Failed to update status. Error: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered claims computed state
  const filteredClaims = claims.filter((claim) => {
    const name = (claim.fullName || '').toLowerCase();
    const email = (claim.email || '').toLowerCase();
    const cc = (claim.costCenter || '').toLowerCase();
    const role = (claim.jobTitle || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = 
      name.includes(query) || 
      email.includes(query) || 
      cc.includes(query) || 
      role.includes(query);

    const matchesStatus = statusFilter === 'All' || claim.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fef3c7', text: '#d97706', border: 'rgba(217, 119, 6, 0.15)' };
      case 'Approved': return { bg: '#d1fae5', text: '#059669', border: 'rgba(5, 150, 105, 0.15)' };
      case 'Reimbursed': return { bg: '#dbeafe', text: '#2563eb', border: 'rgba(37, 99, 235, 0.15)' };
      case 'Rejected': return { bg: '#fee2e2', text: '#dc2626', border: 'rgba(220, 38, 38, 0.15)' };
      default: return { bg: '#f1f5f9', text: '#475569', border: 'rgba(71, 85, 105, 0.15)' };
    }
  };

  // Metric stats calculated from original claims array
  const totalPendingCount = claims.filter(c => c.status === 'Pending').length;
  const totalClaimedSum = claims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const reimbursedSum = claims
    .filter(c => c.status === 'Reimbursed')
    .reduce((sum, c) => sum + (c.totalAmount || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Navbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1rem 1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
            color: 'white',
            padding: '0.4rem 0.5rem',
            borderRadius: '8px',
            fontWeight: '800',
            fontSize: '0.85rem'
          }}>
            RM
          </div>
          <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.05rem' }}>
            Reimbursement Admin Center
          </span>
        </div>

        <button
          onClick={onSignOut}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            borderRadius: '10px',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#fca5a5'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
        >
          <LogOut size={16} />
          <span>Exit Admin</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
          <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.75rem', borderRadius: '12px' }}><Clock size={24} /></div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Pending Approvals</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>{totalPendingCount} claims</h3>
          </div>
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
          <div style={{ background: '#d1fae5', color: '#059669', padding: '0.75rem', borderRadius: '12px' }}><CheckCircle size={24} /></div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Reimbursed</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>Rp {reimbursedSum.toLocaleString('id-ID')}</h3>
          </div>
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
          <div style={{ background: '#dbeafe', color: '#2563eb', padding: '0.75rem', borderRadius: '12px' }}><DollarSign size={24} /></div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Overall Claims Pool</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>Rp {totalClaimedSum.toLocaleString('id-ID')}</h3>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
        
        {/* Filter controls bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
            Reimbursement Claims Database
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', width: '100%', maxWidth: '600px', justifyContent: 'flex-end' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search name, job title, office branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Status select dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 1.5rem 0.5rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                background: 'white',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Reimbursed">Reimbursed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Claims Table Container */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '4rem 0', color: '#64748b' }}>
            <Loader2 className="scanner-spinner" size={32} />
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Loading client claims...</span>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
            <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <span style={{ fontSize: '0.95rem' }}>No claims matching your filter criteria.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#475569' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Employee Profile</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Trip Purpose</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Dates</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Receipts</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', minWidth: '160px' }}>Verify Claim</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Portal</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => {
                  const badge = getStatusBadgeStyles(claim.status);
                  const isProcessing = updatingId === claim.id;

                  return (
                    <tr key={claim.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {/* Name & Job info */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700', color: '#1e293b' }}>{claim.fullName}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {claim.jobTitle || 'No Title'} &bull; <strong style={{ color: '#4f46e5' }}>{claim.costCenter || 'No Branch'}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Purpose */}
                      <td style={{ padding: '0.85rem 1rem', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={claim.tripPurpose}>
                        {claim.tripPurpose}
                      </td>

                      {/* Dates */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{claim.tripStartDate || 'No Date'}</span>
                          <span style={{ fontSize: '0.75rem' }}>to {claim.tripEndDate || 'No Date'}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '800', color: '#1e293b', fontSize: '0.9rem' }}>
                        Rp {claim.totalAmount ? claim.totalAmount.toLocaleString('id-ID') : 0}
                      </td>

                      {/* Receipts count */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                        {claim.attachments ? claim.attachments.length : 0} items
                      </td>

                      {/* Status changer buttons */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {isProcessing ? (
                          <Loader2 className="scanner-spinner" size={16} style={{ color: '#4f46e5', margin: '0 auto' }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                            {/* Current Badge Indicator */}
                            <span style={{
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                              padding: '0.25rem 0.5rem',
                              borderRadius: '8px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              width: '100px',
                              textAlign: 'center'
                            }}>
                              {claim.status || 'Pending'}
                            </span>

                            {/* Dropdown status actions for verification */}
                            <select
                              value={claim.status || 'Pending'}
                              onChange={(e) => handleUpdateStatus(claim.id, e.target.value)}
                              style={{
                                fontSize: '0.75rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                background: '#f8fafc',
                                padding: '0.2rem 0.35rem',
                                outline: 'none',
                                cursor: 'pointer',
                                width: '110px'
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Reimbursed">Reimbursed</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Link to view rekap */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <a
                          href={`/?view=${claim.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#4f46e5',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: '700',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          Open <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
