import React, { useEffect, useState } from 'react';
import { contactsAPI } from '../services/api';
import toast from 'react-hot-toast';

const card = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 10 };
const inp = { width: '100%', padding: '8px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box', marginBottom: 10 };
const btnPrimary = { padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: 'linear-gradient(90deg,#00D4FF,#39FF14)', color: '#0a0f1e', fontWeight: 700, fontFamily: 'Inter,sans-serif' };

const STATUS_COLORS = { hot: '#FAECE7', warm: '#FAEEDA', cold: '#E6F1FB', customer: '#EAF3DE', lost: '#f0f0f0' };
const STATUS_TEXT = { hot: '#712B13', warm: '#633806', cold: '#0C447C', customer: '#27500A', lost: '#888' };

export default function Contacts() {
  const clientId = localStorage.getItem('nxf_client') || '';
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', platform: 'whatsapp', lead_status: 'cold' });

  const load = () => {
    if (!clientId) return;
    contactsAPI.getAll({ client_id: clientId, search, platform, lead_status: leadStatus, limit: 100 })
      .then(r => setContacts(r.data.data));
  };

  useEffect(() => { load(); }, [clientId, search, platform, leadStatus]);

  const save = async () => {
    if (!form.name) return toast.error('Name required');
    await contactsAPI.create({ ...form, client_id: clientId });
    toast.success('Contact added');
    setShowForm(false);
    load();
  };

  const del = async (id) => {
    await contactsAPI.delete(id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Contacts ({contacts.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 14px', border: '0.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>Import CSV</button>
          <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>+ Add Contact</button>
        </div>
      </div>

      <div style={{ ...card, display: 'flex', gap: 8 }}>
        <input style={{ ...inp, marginBottom: 0, flex: 2 }} placeholder="Search name, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inp, marginBottom: 0, flex: 1 }} value={platform} onChange={e => setPlatform(e.target.value)}>
          <option value="">All platforms</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
        </select>
        <select style={{ ...inp, marginBottom: 0, flex: 1 }} value={leadStatus} onChange={e => setLeadStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="hot">Hot lead</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="customer">Customer</option>
        </select>
      </div>

      {showForm && (
        <div style={{ ...card, borderColor: 'rgba(0,212,255,0.3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={{ fontSize: 11, color: '#888' }}>Name *</label><input style={inp} placeholder="Contact name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <label style={{ fontSize: 11, color: '#888' }}>
                {form.platform === 'whatsapp' ? 'Phone *' : form.platform === 'instagram' ? 'Instagram Username or Scoped ID *' : 'Facebook Scoped ID *'}
              </label>
              <input 
                style={inp} 
                placeholder={form.platform === 'whatsapp' ? "+8801863272373" : form.platform === 'instagram' ? "@username or ID" : "Facebook User ID"} 
                value={form.phone} 
                onChange={e => setForm({ ...form, phone: e.target.value })} 
              />
            </div>
            <div><label style={{ fontSize: 11, color: '#888' }}>Platform</label>
              <select style={inp} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value, phone: '' })}>
                <option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option>
              </select>
            </div>
            <div><label style={{ fontSize: 11, color: '#888' }}>Lead status</label>
              <select style={inp} value={form.lead_status} onChange={e => setForm({ ...form, lead_status: e.target.value })}>
                <option value="cold">Cold</option><option value="warm">Warm</option><option value="hot">Hot</option><option value="customer">Customer</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnPrimary} onClick={save}>Save</button>
            <button style={{ padding: '8px 16px', border: '0.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13 }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={card}>
        {contacts.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #f5f5f5' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#534AB7', fontSize: 13, flexShrink: 0 }}>
              {(c.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name || 'Unknown'}</div>
              <div style={{ fontSize: 11, color: '#8892a4' }}>{c.phone || c.username} · {c.platform}</div>
            </div>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: STATUS_COLORS[c.lead_status] || '#f0f0f0', color: STATUS_TEXT[c.lead_status] || '#888' }}>{c.lead_status}</span>
            <button style={{ fontSize: 11, padding: '3px 10px', border: '0.5px solid #fca5a5', borderRadius: 6, color: '#991b1b', cursor: 'pointer', background: 'none' }} onClick={() => del(c.id)}>Delete</button>
          </div>
        ))}
        {!contacts.length && <div style={{ textAlign: 'center', padding: 24, color: '#888', fontSize: 13 }}>No contacts found.</div>}
      </div>
    </div>
  );
}
