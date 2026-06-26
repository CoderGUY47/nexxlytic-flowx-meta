import React, { useState, useEffect } from 'react';
import { clientsAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const card={background:'#fff',border:'0.5px solid #e5e7eb',borderRadius:12,padding:16,marginBottom:12};
const inp={width:'100%',padding:'8px 12px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'Inter,sans-serif',boxSizing:'border-box',marginBottom:10};
const btnPrimary={padding:'8px 16px',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,background:'linear-gradient(90deg,#00D4FF,#39FF14)',color:'#0a0f1e',fontWeight:700,fontFamily:'Inter,sans-serif'};

export default function Settings() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(localStorage.getItem('nxf_client') || '');
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [apiKey, setApiKey] = useState(user?.api_key || '');
  const [showKey, setShowKey] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '', business_name: '',
    wa_phone_number_id: '', wa_access_token: '',
    ig_page_token: '', fb_page_token: '', fb_page_id: ''
  });

  useEffect(() => { 
    clientsAPI.getAll().then(r => setClients(r.data.data)); 
    
    // Check for Facebook OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'success') {
      toast.success('Meta page & accounts connected successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
      clientsAPI.getAll().then(r => setClients(r.data.data));
    } else if (params.get('oauth') === 'failed') {
      toast.error(`Meta connection failed: ${params.get('reason') || 'Unknown reason'}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const selectClient = (id) => {
    localStorage.setItem('nxf_client', id);
    setActiveClient(id);
    toast.success('Client switched!');
  };

  const addClient = async () => {
    if (!clientForm.name) return toast.error('Client name required');
    const r = await clientsAPI.create(clientForm);
    setClients(prev => [...prev, r.data.client]);
    setShowAddClient(false);
    setClientForm({ name: '', business_name: '', wa_phone_number_id: '', wa_access_token: '', ig_page_token: '', fb_page_token: '', fb_page_id: '' });
    toast.success('Client added!');
  };

  const regenKey = async () => {
    const r = await authAPI.regenerateKey();
    setApiKey(r.data.api_key);
    toast.success('API key regenerated!');
  };

  const startEdit = (c) => {
    setEditingClient(c.id);
    setEditForm({
      name: c.name || '',
      business_name: c.business_name || '',
      wa_phone_number_id: c.wa_phone_number_id || '',
      wa_access_token: c.wa_access_token || '',
      ig_page_token: c.ig_page_token || '',
      fb_page_token: c.fb_page_token || '',
      fb_page_id: c.fb_page_id || ''
    });
  };

  const saveEdit = async (id) => {
    try {
      await clientsAPI.update(id, editForm);
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c));
      setEditingClient(null);
      toast.success('Client updated!');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Settings</h2>

      {/* API Key */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Your API Key</div>
        <div style={{ background: '#0a0f1e', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#00D4FF' }}>
            {showKey ? apiKey : apiKey.slice(0, 12) + '••••••••••••••••••••••'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }} onClick={() => setShowKey(!showKey)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('Copied!'); }}>
              Copy
            </button>
          </div>
        </div>
        <button style={{ ...btnPrimary, fontSize: 12, padding: '6px 14px' }} onClick={regenKey}>Regenerate Key</button>
        <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Use this key for mobile SDK: <code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>X-API-Key: {apiKey.slice(0,20)}...</code></div>
      </div>

      {/* Clients */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Client Accounts</div>
          <button style={btnPrimary} onClick={() => setShowAddClient(!showAddClient)}>+ Add Client</button>
        </div>

        {showAddClient && (
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: '#0a0f1e' }}>New client</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={{ fontSize: 11, color: '#888' }}>Client name *</label><input style={inp} placeholder="e.g. Style Hub" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888' }}>Business name</label><input style={inp} placeholder="Business name" value={clientForm.business_name} onChange={e => setClientForm({ ...clientForm, business_name: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888' }}>WA Phone Number ID</label><input style={inp} placeholder="From Meta Business" value={clientForm.wa_phone_number_id} onChange={e => setClientForm({ ...clientForm, wa_phone_number_id: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888' }}>WA Access Token</label><input style={inp} type="password" placeholder="WhatsApp API token" value={clientForm.wa_access_token} onChange={e => setClientForm({ ...clientForm, wa_access_token: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888' }}>Facebook Page ID</label><input style={inp} placeholder="FB Page ID" value={clientForm.fb_page_id} onChange={e => setClientForm({ ...clientForm, fb_page_id: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: '#888' }}>FB/IG Page Token</label><input style={inp} type="password" placeholder="Page access token" value={clientForm.fb_page_token} onChange={e => setClientForm({ ...clientForm, fb_page_token: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary} onClick={addClient}>Save Client</button>
              <button style={{ padding: '8px 14px', border: '0.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13 }} onClick={() => setShowAddClient(false)}>Cancel</button>
            </div>
          </div>
        )}

        {clients.map(c => (
          <div key={c.id} style={{ borderBottom: '0.5px solid #f5f5f5', paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{c.business_name}</div>
                {c.wa_phone_number_id && <div style={{ fontSize: 10, color: '#00D4FF', marginTop: 2 }}>📱 {c.wa_phone_number_id}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: 'transparent', color: '#8892a4', border: '0.5px solid #e5e7eb' }}
                  onClick={() => editingClient === c.id ? setEditingClient(null) : startEdit(c)}
                >
                  {editingClient === c.id ? 'Cancel' : '✏️ Edit'}
                </button>
                <button
                  style={{ padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, background: activeClient === c.id ? 'linear-gradient(90deg,#00D4FF,#39FF14)' : 'transparent', color: activeClient === c.id ? '#0a0f1e' : '#00D4FF', border: activeClient === c.id ? 'none' : '0.5px solid #00D4FF', fontWeight: activeClient === c.id ? 700 : 400 }}
                  onClick={() => selectClient(c.id)}
                >
                  {activeClient === c.id ? 'Active' : 'Select'}
                </button>
              </div>
            </div>

            {editingClient === c.id && (
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: '#0a0f1e' }}>Edit Client</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={{ fontSize: 11, color: '#888' }}>Client name *</label><input style={inp} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                  <div><label style={{ fontSize: 11, color: '#888' }}>Business name</label><input style={inp} value={editForm.business_name} onChange={e => setEditForm({ ...editForm, business_name: e.target.value })} /></div>
                  <div><label style={{ fontSize: 11, color: '#888' }}>WA Phone Number ID</label><input style={inp} placeholder="1114352238437100" value={editForm.wa_phone_number_id} onChange={e => setEditForm({ ...editForm, wa_phone_number_id: e.target.value })} /></div>
                  <div><label style={{ fontSize: 11, color: '#888' }}>WA Access Token</label><input style={inp} type="password" placeholder="WhatsApp API token" value={editForm.wa_access_token} onChange={e => setEditForm({ ...editForm, wa_access_token: e.target.value })} /></div>
                  <div><label style={{ fontSize: 11, color: '#888' }}>Facebook Page ID</label><input style={inp} placeholder="FB Page ID" value={editForm.fb_page_id} onChange={e => setEditForm({ ...editForm, fb_page_id: e.target.value })} /></div>
                  <div><label style={{ fontSize: 11, color: '#888' }}>FB/IG Page Token</label><input style={inp} type="password" placeholder="Page access token" value={editForm.fb_page_token} onChange={e => setEditForm({ ...editForm, fb_page_token: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <button style={btnPrimary} onClick={() => saveEdit(c.id)}>Save Changes</button>
                  <a
                    href={`http://localhost:5000/api/oauth/facebook?client_id=${c.id}`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      textDecoration: 'none',
                      background: 'linear-gradient(90deg, #1877F2, #0A7CFF)',
                      color: '#fff',
                      fontWeight: 700,
                      fontFamily: 'Inter,sans-serif',
                      display: 'inline-block'
                    }}
                  >
                    🔌 Connect Facebook
                  </a>
                  <button style={{ padding: '8px 14px', border: '0.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: 'transparent', color: '#64748b' }} onClick={() => setEditingClient(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!clients.length && <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 13 }}>No clients yet. Add your first client!</div>}
      </div>

      {/* Webhook URLs */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Webhook URLs</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Meta (WhatsApp / Instagram / Facebook) webhook mein set karein:</div>
        {[
          { label: 'WhatsApp webhook', url: `${window.location.origin.replace('3000', '5000')}/webhook/whatsapp` },
          { label: 'Instagram/Facebook webhook', url: `${window.location.origin.replace('3000', '5000')}/webhook/meta` },
        ].map(w => (
          <div key={w.label} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{w.label}</div>
            <div style={{ background: '#0a0f1e', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#39FF14' }}>{w.url}</span>
              <button style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(w.url); toast.success('Copied!'); }}>Copy</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
