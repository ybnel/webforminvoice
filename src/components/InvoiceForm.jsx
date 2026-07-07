import React, { useState, useEffect, useRef } from 'react';
import { Trash2, UploadCloud, FileText, User, Camera, Image, Crop, Loader2, X, ExternalLink, Calendar, Landmark, Briefcase } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

// Helper function to read file as Base64 Data URL
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// Budget configuration per person
const BUDGETS = {
  'Lunch': 30000,
  'Dinner': 50000,
  'Transport (Departure)': 150000,
  'Transport (Return)': 150000,
  'Ticket': 0,
  'Others': 0
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
  
  // Profile input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [saveProfile, setSaveProfile] = useState(true);

  // Claims history state
  const [historyClaims, setHistoryClaims] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Date modal state for uploads
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [uploadAction, setUploadAction] = useState(null); // 'camera' | 'gallery'

  const fileInputRef = useRef(null);

  // Calculate total amount automatically
  const totalAmount = attachments.reduce((sum, att) => sum + (parseFloat(att.amount) || 0), 0);

  // Load profile cache on mount
  useEffect(() => {
    const cachedName = localStorage.getItem('profile_fullname') || '';
    const cachedEmail = localStorage.getItem('profile_email') || '';
    const cachedPhone = localStorage.getItem('profile_phone') || '';
    const cachedCostCenter = localStorage.getItem('profile_costcenter') || '';
    const cachedJobTitle = localStorage.getItem('profile_jobtitle') || '';
    const cachedSave = localStorage.getItem('profile_save_consent') !== 'false';

    setFullName(cachedName);
    setEmail(cachedEmail);
    setPhone(cachedPhone);
    setCostCenter(cachedCostCenter);
    setJobTitle(cachedJobTitle);
    setSaveProfile(cachedSave);
  }, []);

  // Fetch claims history dynamically when email updates
  useEffect(() => {
    if (email && email.trim() !== '') {
      fetchUserHistory(email.trim().toLowerCase());
    } else {
      setHistoryClaims([]);
      setLoadingHistory(false);
    }
  }, [email]);

  const fetchUserHistory = async (targetEmail) => {
    try {
      setLoadingHistory(true);
      const q = query(
        collection(db, "reimbursements"),
        where("email", "==", targetEmail)
      );
      const querySnapshot = await getDocs(q);
      const claims = [];
      querySnapshot.forEach((doc) => {
        claims.push({ id: doc.id, ...doc.data() });
      });

      // Sort locally by creation date descending
      claims.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setHistoryClaims(claims);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getDateRange = (start, end) => {
    const dates = [];
    if (!start || !end) return dates;
    
    // Parse using parts to avoid timezone shifting
    const [startYear, startMonth, startDay] = start.split('-').map(Number);
    const [endYear, endMonth, endDay] = end.split('-').map(Number);
    
    // Create Date objects in local time
    const s = new Date(startYear, startMonth - 1, startDay);
    const e = new Date(endYear, endMonth - 1, endDay);
    
    if (s > e) return dates;
    
    const cur = new Date(s);
    while (cur <= e) {
      // Format as YYYY-MM-DD in local time
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // Convert date format to clean English layout
  const formatDateEnglish = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleInitiateUpload = (action) => {
    if (!tripStartDate || !tripEndDate) {
      alert("Please fill in both Departure Date and Return Date first.");
      return;
    }
    const dates = getDateRange(tripStartDate, tripEndDate);
    if (dates.length === 0) {
      alert("Invalid travel date range selected.");
      return;
    }
    setSelectedDate(dates[0]); // default to first day of trip
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

  // Update category
  const handleCategoryChange = (attId, newCategory, currentPax) => {
    onFieldChange(attId, 'category', newCategory);
  };

  // Update pax
  const handlePaxChange = (attId, currentCategory, newPax) => {
    const paxVal = parseInt(newPax) || 1;
    onFieldChange(attId, 'numberOfPersons', paxVal);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (attachments.length === 0) {
      alert("Please upload at least 1 receipt file.");
      return;
    }

    const missingDetails = attachments.some(att => 
      !att.category || !att.description || !att.invoiceDate || !att.amount
    );
    if (missingDetails) {
      alert("Please complete Category, Description, Date, and Amount for all uploaded receipts.");
      return;
    }

    const invalidAmount = attachments.some(att => parseFloat(att.amount) <= 0 || isNaN(parseFloat(att.amount)));
    if (invalidAmount) {
      alert("Please enter a valid expense amount for all receipts.");
      return;
    }

    // Budget Limit Validation
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      const category = att.category;
      const amount = parseFloat(att.amount) || 0;
      const pax = parseInt(att.numberOfPersons) || 1;
      const budgetPerPax = BUDGETS[category] || 0;
      
      if (budgetPerPax > 0) {
        const isFood = category === 'Lunch' || category === 'Dinner';
        const maxAllowed = isFood ? (budgetPerPax * pax) : budgetPerPax;
        if (amount > maxAllowed) {
          alert(
            `Budget Limit Exceeded!\n\n` +
            `Receipt #${i + 1} (${category}) exceeds the allowable budget.\n` +
            `Maximum limit: Rp ${maxAllowed.toLocaleString('id-ID')}${isFood ? ` (${pax} Pax)` : ''}\n` +
            `Your input: Rp ${amount.toLocaleString('id-ID')}\n\n` +
            `Please adjust the nominal amount to be within the allowable limit.`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    setSubmitStatus('Processing receipt files to Base64...');

    // Save profile cache or clear it depending on permission checkbox
    if (saveProfile) {
      localStorage.setItem('profile_fullname', fullName);
      localStorage.setItem('profile_email', email);
      localStorage.setItem('profile_phone', phone);
      localStorage.setItem('profile_costcenter', costCenter);
      localStorage.setItem('profile_jobtitle', jobTitle);
      localStorage.setItem('profile_save_consent', 'true');
    } else {
      localStorage.removeItem('profile_fullname');
      localStorage.removeItem('profile_email');
      localStorage.removeItem('profile_phone');
      localStorage.removeItem('profile_costcenter');
      localStorage.removeItem('profile_jobtitle');
      localStorage.setItem('profile_save_consent', 'false');
    }

    try {
      // 1. Process files to Base64 strings
      const uploadPromises = attachments.map(async (att) => {
        let base64Url = att.url;
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
          numberOfPersons: parseInt(att.numberOfPersons) || 1,
          url: base64Url
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // 2. Save structured record to Cloud Firestore
      setSubmitStatus('Saving claim details to database...');
      const docRef = await addDoc(collection(db, "reimbursements"), {
        fullName: fullName,
        email: email.toLowerCase(),
        phone: phone,
        costCenter: costCenter,
        jobTitle: jobTitle,
        tripPurpose: e.target.tripPurpose.value,
        tripStartDate: tripStartDate,
        tripEndDate: tripEndDate,
        totalAmount: totalAmount,
        attachments: uploadedFiles,
        status: 'Pending', // initial status
        createdAt: new Date()
      });

      console.log("Document saved with ID: ", docRef.id);

      // 3. Send view portal link to Google Sheets via Webhook
      const webhookUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
      if (webhookUrl && webhookUrl !== 'YOUR_GOOGLE_SHEETS_WEBHOOK_URL' && webhookUrl.trim() !== '') {
        setSubmitStatus('Logging claim to sheets database...');
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fullName: fullName,
              email: email.toLowerCase(),
              phone: phone,
              tripPurpose: e.target.tripPurpose.value,
              description: `Office Branch: ${costCenter}, Job: ${jobTitle}. Receipts: ` + attachments.map(att => `${att.category} (${att.description})`).join(', '),
              invoiceDate: `${tripStartDate} to ${tripEndDate}`,
              totalAmount: totalAmount,
              attachments: [{ 
                category: 'Claim Portal Link', 
                url: `${window.location.origin}/?view=${docRef.id}` 
              }]
            })
          });
        } catch (sheetError) {
          console.error("Failed Google Sheets sync:", sheetError);
        }
      }

      alert(
        'Reimbursement claim successfully submitted!\n' +
        `Total Claimed: Rp ${totalAmount.toLocaleString('id-ID')}\n` +
        `Claim status is now Pending verification.`
      );

      // Reset form and local attachment states
      e.target.tripPurpose.value = '';
      setTripStartDate('');
      setTripEndDate('');
      onClearAttachments();
      
      // Refresh claims history list
      fetchUserHistory(email.trim().toLowerCase());

    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit claim. Please try again. Error: " + error.message);
    } finally {
      setIsSubmitting(false);
      setSubmitStatus('');
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fef3c7', text: '#d97706' };
      case 'Approved': return { bg: '#d1fae5', text: '#059669' };
      case 'Reimbursed': return { bg: '#dbeafe', text: '#2563eb' }; 
      case 'Rejected': return { bg: '#fee2e2', text: '#dc2626' };ssssssss
      default: return { bg: '#f1f5f9', text: '#475569' };
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
        <h1>Expense Reimbursement Form</h1>
        <p>Complete your personal profile and claim details below</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Profile Section */}
        <div className="section">
          <h2 className="section-title"><User size={20} /> Personal Information</h2>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="fullName">Full Name</label>
              <input 
                id="fullName" 
                name="fullName" 
                type="text" 
                placeholder="John Doe" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isSubmitting} 
              />
            </div>
            <div className="input-group">
              <label htmlFor="phone">Phone Number</label>
              <input 
                id="phone" 
                name="phone" 
                type="tel" 
                placeholder="081234567890" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required 
                disabled={isSubmitting} 
              />
            </div>
          </div>
          <div className="grid-2" style={{ marginTop: '0.75rem' }}>
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="johndoe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                disabled={isSubmitting} 
              />
            </div>
            <div className="grid-2" style={{ gap: '1rem', margin: 0, padding: 0 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label htmlFor="costCenter"><Landmark size={14} style={{ display: 'inline', marginRight: '0.2rem', verticalAlign: 'middle' }} /> Office Branch</label>
                <input 
                  id="costCenter" 
                  name="costCenter" 
                  type="text" 
                  placeholder="Surabaya / Bandung" 
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  required 
                  disabled={isSubmitting} 
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label htmlFor="jobTitle"><Briefcase size={14} style={{ display: 'inline', marginRight: '0.2rem', verticalAlign: 'middle' }} /> Job Title / Role</label>
                <select 
                  id="jobTitle" 
                  name="jobTitle" 
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required 
                  disabled={isSubmitting} 
                  style={{ padding: '0.65rem 0.75rem', height: 'auto' }}
                >
                  <option value="" disabled>-- Job Title --</option>
                  <option value="CC">CC</option>
                  <option value="PA">PA</option>
                  <option value="RD">RD</option>
                  <option value="Teacher">Teacher</option>
                  <option value="STM">STM</option>
                  <option value="PM">PM</option>
                  <option value="Manager">Manager</option>
                  <option value="Director">Director</option>
                </select>
              </div>
            </div>
          </div>

          {/* Device Profile Cache Storage Consent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem', padding: '0 0.25rem' }}>
            <input
              type="checkbox"
              id="saveProfileCheckbox"
              checked={saveProfile}
              onChange={(e) => setSaveProfile(e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <label htmlFor="saveProfileCheckbox" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
              Remember my personal details on this device for future claims
            </label>
          </div>
        </div>

        {/* Claim Details Section */}
        <div className="section">
          <h2 className="section-title"><FileText size={20} /> Application Details</h2>
          
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="tripPurpose">Trip Purpose / Expense Context</label>
            <input 
              id="tripPurpose" 
              name="tripPurpose" 
              type="text" 
              placeholder="e.g., Tech conference in Jakarta / Client visit to Bali" 
              required 
              disabled={isSubmitting} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tripStartDate">Departure Date</label>
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
              <label htmlFor="tripEndDate">Return Date</label>
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
              <label htmlFor="totalAmountDisplay">Total Expense (Rp)</label>
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
          <h2 className="section-title"><UploadCloud size={20} /> Attachment Receipts</h2>
          <div className="input-group">
            <label>Upload Receipt Files (Max 15)</label>

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
                Maximum limit of 15 attachments reached. Please submit this claim form or delete unwanted attachments.
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
                  <span>Capture Photo (Scan)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}
                  onClick={() => handleInitiateUpload('gallery')}
                  disabled={isSubmitting}
                >
                  <Image size={24} style={{ margin: '0 auto' }} />
                  <span>Choose Gallery</span>
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
                          title="Crop & Rotate"
                          disabled={isSubmitting}
                          style={{ padding: '0.35rem' }}
                        >
                          <Crop size={18} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => onRemoveAttachment(att.id)}
                          title="Delete Attachment"
                          disabled={isSubmitting}
                          style={{ padding: '0.35rem' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Inputs Grid */}
                    <div className="receipt-grid">
                      {/* Category */}
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: 'var(--text-muted)' }}>Category</label>
                        <select
                          value={att.category || ''}
                          onChange={(e) => handleCategoryChange(att.id, e.target.value, att.numberOfPersons || 1)}
                          required
                          disabled={isSubmitting}
                          style={{ padding: '0.45rem 0.5rem', fontSize: '0.85rem', borderRadius: '6px', height: 'auto', border: '1px solid var(--border)' }}
                        >
                          <option value="" disabled>-- Select --</option>
                          <option value="Lunch">Lunch</option>
                          <option value="Dinner">Dinner</option>
                          <option value="Transport (Departure)">Transport (Departure)</option>
                          <option value="Transport (Return)">Transport (Return)</option>
                          <option value="Ticket">Ticket</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>

                      {/* Nominal Amount */}
                      {(() => {
                        const isFood = att.category === 'Lunch' || att.category === 'Dinner';
                        const maxAllowed = isFood 
                          ? ((BUDGETS[att.category] || 0) * (parseInt(att.numberOfPersons) || 1))
                          : (BUDGETS[att.category] || 0);
                        const isOverBudget = BUDGETS[att.category] > 0 && parseFloat(att.amount) > maxAllowed;
                        return (
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: isOverBudget ? 'var(--danger)' : 'var(--text-muted)' }}>Nominal (Rp)</label>
                            <input
                              type="number"
                              placeholder="e.g., 150000"
                              className="no-spin"
                              value={att.amount || ''}
                              onChange={(e) => onFieldChange(att.id, 'amount', e.target.value)}
                              required
                              disabled={isSubmitting}
                              style={{ 
                                padding: '0.45rem 0.5rem', 
                                fontSize: '0.85rem', 
                                borderRadius: '6px', 
                                height: 'auto', 
                                border: isOverBudget ? '1.5px solid var(--danger)' : '1px solid var(--border)',
                                outlineColor: isOverBudget ? 'var(--danger)' : undefined
                              }}
                            />
                            {isOverBudget && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--danger)', marginTop: '0.15rem', fontWeight: '700' }}>
                                Max Rp {maxAllowed.toLocaleString('id-ID')}{isFood ? ` (${att.numberOfPersons || 1} Pax)` : ''}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Date */}
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: 'var(--text-muted)' }}>Date</label>
                        <select
                          value={att.invoiceDate || ''}
                          onChange={(e) => onFieldChange(att.id, 'invoiceDate', e.target.value)}
                          required
                          disabled={isSubmitting}
                          style={{ padding: '0.45rem 0.5rem', fontSize: '0.85rem', borderRadius: '6px', height: 'auto', border: '1px solid var(--border)' }}
                        >
                          {att.invoiceDate && !getDateRange(tripStartDate, tripEndDate).includes(att.invoiceDate) && (
                            <option value={att.invoiceDate}>{formatDateEnglish(att.invoiceDate)}</option>
                          )}
                          {getDateRange(tripStartDate, tripEndDate).map((d) => (
                            <option key={d} value={d}>
                              {formatDateEnglish(d)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Pax / Traveler Count */}
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: 'var(--text-muted)' }}>Pax (Persons)</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={att.numberOfPersons || 1}
                          onChange={(e) => handlePaxChange(att.id, att.category || '', e.target.value)}
                          required
                          disabled={isSubmitting}
                          style={{ padding: '0.45rem 0.5rem', fontSize: '0.85rem', borderRadius: '6px', height: 'auto', border: '1px solid var(--border)' }}
                        />
                      </div>

                      {/* Description */}
                      <div className="input-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: 'var(--text-muted)' }}>Description</label>
                        <input
                          type="text"
                          placeholder="e.g., Client lunch meeting"
                          value={att.description || ''}
                          onChange={(e) => onFieldChange(att.id, 'description', e.target.value)}
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

        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
          Submit Claim Form
        </button>
      </form>

      {/* History Log Section */}
      <div className="section" style={{ marginTop: '2.5rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
        <h2 className="section-title" style={{ color: 'var(--text-main)', marginBottom: '1.25rem' }}>
          <Landmark size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> My Claims History
        </h2>

        {loadingHistory ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
            <Loader2 className="scanner-spinner" size={18} />
            <span style={{ fontSize: '0.9rem' }}>Loading claim logs...</span>
          </div>
        ) : !email || email.trim() === '' ? (
          <div style={{ background: '#f8fafc', border: '1px dashed var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter your email address in the profile section above to view your claims history on this device.
          </div>
        ) : historyClaims.length === 0 ? (
          <div style={{ background: '#f8fafc', border: '1px dashed var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No claims registered under <strong>{email}</strong>.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', fontWeight: '600', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Submitted On</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Purpose</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Trip Period</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {historyClaims.map((claim) => {
                  const subDate = claim.createdAt?.toDate 
                    ? claim.createdAt.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Recent';
                  const badge = getStatusBadgeColor(claim.status);
                  
                  return (
                    <tr key={claim.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '500' }}>{subDate}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={claim.tripPurpose}>
                        {claim.tripPurpose}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        {claim.tripStartDate} to {claim.tripEndDate}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                        Rp {claim.totalAmount.toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          background: badge.bg,
                          color: badge.text,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          display: 'inline-block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em'
                        }}>
                          {claim.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <a 
                          href={`/?view=${claim.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontWeight: '600',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          View <ExternalLink size={12} />
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
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>Select Receipt Date</h3>
              <button 
                type="button" 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.25rem' }} 
                onClick={() => setShowDateModal(false)}
              >
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Choose the transaction date for this receipt upload:
            </p>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
              >
                {getDateRange(tripStartDate, tripEndDate).map((d) => (
                  <option key={d} value={d}>
                    {formatDateEnglish(d)}
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
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, margin: 0, padding: '0.65rem' }}
                onClick={handleConfirmUpload}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Footer Admin Link */}
      <div style={{ textAlign: 'center', marginTop: '2.5rem', paddingBottom: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <a 
          href="/?admin=true" 
          style={{ 
            fontSize: '0.8rem', 
            color: 'var(--text-muted)', 
            textDecoration: 'none', 
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
          onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
        >
          <Landmark size={14} /> Open Admin Portal
        </a>
      </div>
    </div>
  );
}

export default InvoiceForm;
