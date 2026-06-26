import React, { useEffect, useState } from 'react';
import { keywordsAPI, clientsAPI } from '../services/api';
import toast from 'react-hot-toast';
const card={background:'#fff',border:'0.5px solid #e5e7eb',borderRadius:12,padding:16,marginBottom:10};
const inp={width:'100%',padding:'8px 12px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontFamily:'Inter,sans-serif',boxSizing:'border-box',marginBottom:10};
const btnPrimary={padding:'8px 16px',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,background:'linear-gradient(90deg,#00D4FF,#39FF14)',color:'#0a0f1e',fontWeight:700,fontFamily:'Inter,sans-serif'};

export default function Keywords() {
  const clientId = localStorage.getItem('nxf_client') || '';
  const [keywords, setKeywords] = useState([]);
  const [form, setForm] = useState({ keyword: '', platform: 'whatsapp', reply_text: '', match_type: 'contains' });
  const [clients, setClients] = useState([]);
  const [cloneFrom, setCloneFrom] = useState('');
  const [lastClonedIds, setLastClonedIds] = useState(null);

  useEffect(() => {
    if (clientId) keywordsAPI.getAll(clientId).then(r => setKeywords(r.data.data));
    clientsAPI.getAll().then(r => setClients(r.data.data || []));
  }, [clientId]);

  const save = async () => {
    if (!form.keyword || !form.reply_text) return toast.error('Keyword and reply required');
    await keywordsAPI.create({ ...form, client_id: clientId });
    toast.success('Keyword added!');
    setForm({ keyword: '', platform: 'whatsapp', reply_text: '', match_type: 'contains' });
    keywordsAPI.getAll(clientId).then(r => setKeywords(r.data.data));
  };

  const del = async (id) => {
    await keywordsAPI.delete(id);
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  const cloneKeywords = async () => {
    if (!cloneFrom) return toast.error('Select a source client');
    if (!clientId) return toast.error('Select active client in Settings first');
    if (cloneFrom === clientId) return toast.error('Source and target client are the same');
    try {
      const r = await keywordsAPI.clone(cloneFrom, clientId);
      toast.success(`Cloned ${r.data.cloned} keywords successfully!`);
      setLastClonedIds(r.data.cloned_ids || []);
      keywordsAPI.getAll(clientId).then(r2 => setKeywords(r2.data.data));
      setCloneFrom('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Clone failed');
    }
  };

  const revertClone = async () => {
    if (!lastClonedIds || !lastClonedIds.length) return;
    try {
      await keywordsAPI.revert(lastClonedIds);
      toast.success('Cloned keywords reverted successfully! ↩️');
      setLastClonedIds(null);
      keywordsAPI.getAll(clientId).then(r => setKeywords(r.data.data));
    } catch (err) {
      toast.error('Revert failed');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Keyword Triggers</h2>

      {/* Clone Keywords from another client */}
      <div style={{ ...card, background: '#f0f9ff', border: '0.5px solid #00D4FF22' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#0a0f1e' }}>📋 Clone keywords from another client</div>
        <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 10 }}>Set up keywords once → copy to any new client instantly. All existing keywords of the target client are kept.</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select style={{ ...inp, marginBottom: 0, flex: 1 }} value={cloneFrom} onChange={e => setCloneFrom(e.target.value)}>
            <option value="">— Select source client —</option>
            {clients.filter(c => c.id !== clientId).map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.business_name ? `(${c.business_name})` : ''}</option>
            ))}
          </select>
          <button style={btnPrimary} onClick={cloneKeywords}>Clone Keywords</button>
          {lastClonedIds && lastClonedIds.length > 0 && (
            <button 
              onClick={revertClone} 
              style={{
                padding: '8px 16px',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'Inter,sans-serif',
                background: '#fee2e2',
                color: '#991b1b',
                fontWeight: 700
              }}
            >
              ↩️ Undo Clone
            </button>
          )}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Add new keyword</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 11, color: '#888' }}>Keyword *</label><input style={inp} placeholder="e.g. price" value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })} /></div>
          <div><label style={{ fontSize: 11, color: '#888' }}>Platform</label>
            <select style={inp} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
              <option value="all">All</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option>
            </select>
          </div>
          <div><label style={{ fontSize: 11, color: '#888' }}>Match type</label>
            <select style={inp} value={form.match_type} onChange={e => setForm({ ...form, match_type: e.target.value })}>
              <option value="contains">Contains</option><option value="exact">Exact</option><option value="starts_with">Starts with</option>
            </select>
          </div>
        </div>
        <label style={{ fontSize: 11, color: '#888' }}>Auto-reply message *</label>
        <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} placeholder="Reply jo automatically jayegi..." value={form.reply_text} onChange={e => setForm({ ...form, reply_text: e.target.value })} />
        <button style={btnPrimary} onClick={save}>Add Keyword</button>
      </div>
      <div style={card}>
        {keywords.map(k => (
          <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #f5f5f5' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#00D4FF', fontFamily: 'monospace', minWidth: 80 }}>"{k.keyword}"</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EAF3DE', color: '#27500A' }}>{k.platform}</span>
            <span style={{ flex: 1, fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.reply_text}</span>
            <span style={{ fontSize: 11, color: '#888' }}>{k.hit_count} hits</span>
            <button style={{ fontSize: 11, padding: '3px 8px', border: '0.5px solid #fca5a5', borderRadius: 6, color: '#991b1b', cursor: 'pointer', background: 'none' }} onClick={() => del(k.id)}>Delete</button>
          </div>
        ))}
        {!keywords.length && <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 13 }}>No keywords yet.</div>}
      </div>
    </div>
  );
}
