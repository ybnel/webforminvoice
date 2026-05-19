import React, { useState } from 'react';
import { Plus, Trash2, UploadCloud, FileText, User, Receipt, Camera, Image } from 'lucide-react';

function App() {
  const [items, setItems] = useState([{ id: 1, name: '', qty: 1, price: '' }]);
  const [fileName, setFileName] = useState('');

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
      const price = parseInt(item.price) || 0;
      const qty = parseInt(item.qty) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const total = calculateSubtotal();

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Form submitted! Ready to connect to Supabase.');
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
            <label>Nama Lengkap</label>
            <input type="text" placeholder="John Doe" required />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Email</label>
              <input type="email" placeholder="john@email.com" />
            </div>
            <div className="input-group">
              <label>Nomor Telepon</label>
              <input type="tel" placeholder="081234567890" />
            </div>
          </div>
        </div>

        {/* Invoice Info Section */}
        <div className="section">
          <h2 className="section-title"><FileText size={20} /> Invoice Details</h2>
          <div className="grid-2">
            <div className="input-group">
              <label>Invoice Number</label>
              <input type="text" placeholder="INV-2026-001" required />
            </div>
            <div className="input-group">
              <label>Invoice Date</label>
              <input type="date" required />
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
              <label className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}>
                <Camera size={24} style={{ margin: '0 auto' }} />
                <span>Buka Kamera</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  style={{ display: 'none' }} 
                  onChange={(e) => setFileName(e.target.files[0]?.name)} 
                />
              </label>

              <label className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', fontWeight: '500' }}>
                <Image size={24} style={{ margin: '0 auto' }} />
                <span>Pilih Galeri/PDF</span>
                <input 
                  type="file" 
                  accept=".pdf,image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => setFileName(e.target.files[0]?.name)} 
                />
              </label>
            </div>
            
            {fileName && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e0e7ff', color: '#4338ca', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} /> File terpilih: <strong>{fileName}</strong>
              </div>
            )}
          </div>
          <div className="input-group">
            <label>Notes</label>
            <textarea rows="3" placeholder="Additional notes or payment instructions..."></textarea>
          </div>
        </div>

        <button type="submit" className="btn btn-primary">
          Submit Invoice
        </button>
      </form>
    </div>
  );
}

export default App;
