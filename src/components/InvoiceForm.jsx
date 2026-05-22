import React, { useState } from 'react';
import { Plus, Trash2, UploadCloud, FileText, User, Receipt, Camera, Image, Crop } from 'lucide-react';

function InvoiceForm({
  attachments = [],
  onOpenScanner,
  onFileChange,
  onOpenEditor,
  onRemoveAttachment
}) {
  const [items, setItems] = useState([{ id: 1, name: '', qty: 1, price: '' }]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), name: '', qty: 1, price: '' }]);
  };

  const handleRemoveItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseFloat(item.qty) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const total = calculateSubtotal();

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const invoicePayload = {
      ...data,
      items,
      total,
      attachments: attachments.map(att => att.file), // actual File objects binary for upload
    };

    console.log('Submitting Invoice Payload:', invoicePayload);
    alert('Form submitted! Ready to connect to Firebase / Google Sheets.\n\nCheck console to see the JSON payload!');
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
              <input id="email" name="email" type="email" placeholder="john@email.com" />
            </div>
            <div className="input-group">
              <label htmlFor="phone">Nomor Telepon</label>
              <input id="phone" name="phone" type="tel" placeholder="081234567890" />
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
        </div>

        {/* Items Section */}
        <div className="section">
          <h2 className="section-title"><Receipt size={20} /> Items</h2>
          {items.map((item) => (
            <div key={item.id} className="item-row">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="Item description"
                  value={item.name}
                  onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                  required
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  step="any"
                  value={item.qty}
                  onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                  required
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  className="no-spin"
                  placeholder="Price"
                  min="0"
                  value={item.price}
                  onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                  required
                />
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => handleRemoveItem(item.id)}
                disabled={items.length === 1}
                style={{
                  opacity: items.length === 1 ? 0.4 : 1,
                  cursor: items.length === 1 ? 'not-allowed' : 'pointer'
                }}
                title="Remove Item"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
            <Plus size={18} /> Add Item
          </button>

          <div className="totals">
            <div className="total-row grand">
              <span>Total Invoice:</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
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
          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="category">Kategori Invoice</label>
            <select id="category" name="category" defaultValue="" required>
              <option value="" disabled>-- Pilih Kategori --</option>
              <option value="Tiket">Tiket</option>
              <option value="Makanan">Makanan</option>
              <option value="Transportasi">Transportasi</option>
              <option value="Lainnya">Lainnya</option>
            </select>
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
