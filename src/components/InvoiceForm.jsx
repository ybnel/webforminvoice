import React from 'react';
import { Trash2, UploadCloud, FileText, User, Camera, Image, Crop } from 'lucide-react';

function InvoiceForm({
  attachments = [],
  onOpenScanner,
  onFileChange,
  onOpenEditor,
  onRemoveAttachment,
  onCategoryChange
}) {

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const invoicePayload = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      totalAmount: parseFloat(data.totalAmount) || 0,
      attachments: attachments.map(att => ({
        name: att.name,
        size: att.size,
        category: att.category
      })),
      files: attachments.map(att => att.file) // actual File binaries for uploading
    };

    console.log('Submitting Invoice Payload:', invoicePayload);
    alert(
      'Form submitted successfully!\n' +
      `Total Claim: Rp ${(parseFloat(data.totalAmount) || 0).toLocaleString('id-ID')}\n` +
      `Jumlah Bukti: ${attachments.length} Struk\n\n` +
      'Check console to see the JSON payload!'
    );
  };

  return (
    <div className="form-container">
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
            <input id="fullName" name="fullName" type="text" placeholder="John Doe" required />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="john@email.com" required />
            </div>
            <div className="input-group">
              <label htmlFor="phone">Nomor Telepon</label>
              <input id="phone" name="phone" type="tel" placeholder="081234567890" required />
            </div>
          </div>
        </div>

        {/* Invoice Info Section */}
        <div className="section">
          <h2 className="section-title"><FileText size={20} /> Invoice Details</h2>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="invoiceNumber">Invoice Number</label>
              <input id="invoiceNumber" name="invoiceNumber" type="text" placeholder="INV-2026-001" required />
            </div>
            <div className="input-group">
              <label htmlFor="invoiceDate">Invoice Date</label>
              <input id="invoiceDate" name="invoiceDate" type="date" required />
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
              >
                <Camera size={24} style={{ margin: '0 auto' }} />
                <span>Ambil Foto (Scan)</span>
              </button>

              <label className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}>
                <Image size={24} style={{ margin: '0 auto' }} />
                <span>Pilih Galeri</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={onFileChange}
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
                      >
                        <Crop size={20} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => onRemoveAttachment(att.id)}
                        title="Hapus Lampiran"
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

        <button type="submit" className="btn btn-primary">
          Submit Invoice
        </button>
      </form>
    </div>
  );
}

export default InvoiceForm;
