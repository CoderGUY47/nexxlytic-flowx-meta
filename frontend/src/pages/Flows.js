// All remaining pages in one file - split into separate files for production

// ============ Flows.js ============
import React, { useEffect, useState } from 'react';
import { flowsAPI, aiAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FlowBuilderCanvas } from '../components/FlowBuilderCanvas';

const card = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 10 };
const inp = { width: '100%', padding: '8px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box', marginBottom: 10 };
const btn = { padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter,sans-serif' };
const btnPrimary = { ...btn, background: 'linear-gradient(90deg,#00D4FF,#39FF14)', color: '#0a0f1e', fontWeight: 700 };

export function Flows() {
  const clientId = localStorage.getItem('nxf_client') || '';
  const [flows, setFlows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [form, setForm] = useState({ name: '', platform: 'whatsapp', trigger_type: 'keyword', trigger_value: '', steps: [] });
  const [editForm, setEditForm] = useState({ name: '', platform: 'whatsapp', trigger_value: '', reply_content: '' });
  const [aiInp, setAiInp] = useState('');
  const [editAiInp, setEditAiInp] = useState('');
  const [aiMsg, setAiMsg] = useState('');

  const [activeBuilderFlow, setActiveBuilderFlow] = useState(null);

  useEffect(() => { if (clientId) flowsAPI.getAll(clientId).then(r => setFlows(r.data.data)); }, [clientId]);

  const save = async () => {
    if (!form.name || !clientId) return toast.error('Fill required fields');
    const steps = [{ type: 'message', content: aiMsg || 'Hello! How can I help you?' }];
    await flowsAPI.create({ ...form, client_id: clientId, steps });
    toast.success('Flow created!');
    setShowForm(false);
    setAiMsg('');
    setAiInp('');
    flowsAPI.getAll(clientId).then(r => setFlows(r.data.data));
  };

  const toggleActive = async (flow) => {
    await flowsAPI.update(flow.id, { ...flow, is_active: !flow.is_active, steps: flow.steps });
    flowsAPI.getAll(clientId).then(r => setFlows(r.data.data));
  };

  const deleteFlow = async (id) => {
    await flowsAPI.delete(id);
    setFlows(prev => prev.filter(f => f.id !== id));
  };

  const genAiMsg = async () => {
    if (!aiInp) return;
    try {
      const r = await aiAPI.reply({ message: aiInp, context: 'business chatbot' });
      setAiMsg(r.data.reply);
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed. Check your API key quota!');
    }
  };

  const startEdit = (flow) => {
    setEditingFlow(flow.id);
    let steps = flow.steps;
    if (typeof steps === 'string') {
      try {
        steps = JSON.parse(steps);
      } catch (e) {
        steps = [];
      }
    }
    const firstMsg = steps?.[0]?.content || '';
    setEditForm({
      name: flow.name || '',
      platform: flow.platform || 'whatsapp',
      trigger_value: flow.trigger_value || '',
      reply_content: firstMsg
    });
    setEditAiInp('');
  };

  const saveEdit = async (id) => {
    if (!editForm.name) return toast.error('Flow name required');
    const steps = [{ type: 'message', content: editForm.reply_content || 'Hello! How can I help you?' }];
    try {
      const flow = flows.find(f => f.id === id);
      await flowsAPI.update(id, {
        name: editForm.name,
        platform: editForm.platform,
        trigger_value: editForm.trigger_value,
        steps,
        is_active: flow ? flow.is_active : true
      });
      toast.success('Flow updated!');
      setEditingFlow(null);
      flowsAPI.getAll(clientId).then(r => setFlows(r.data.data));
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const genEditAiMsg = async () => {
    if (!editAiInp) return;
    try {
      const r = await aiAPI.reply({ message: editAiInp, context: 'business chatbot' });
      setEditForm(prev => ({ ...prev, reply_content: r.data.reply }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed. Check your API key quota!');
    }
  };

  if (activeBuilderFlow) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, height: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Visual Flow Builder: <span style={{ color: '#3B82F6' }}>{activeBuilderFlow.name}</span>
          </h2>
          <span style={{ fontSize: 12, color: '#888' }}>
            Platform: {activeBuilderFlow.platform.toUpperCase()} · Trigger: "{activeBuilderFlow.trigger_value}"
          </span>
        </div>
        <FlowBuilderCanvas
          flow={activeBuilderFlow}
          onSave={async (steps) => {
            try {
              if (activeBuilderFlow.isNew) {
                await flowsAPI.create({
                  client_id: clientId,
                  name: activeBuilderFlow.name,
                  platform: activeBuilderFlow.platform,
                  trigger_type: 'keyword',
                  trigger_value: activeBuilderFlow.trigger_value,
                  steps
                });
                toast.success('Flow created successfully!');
              } else {
                await flowsAPI.update(activeBuilderFlow.id, {
                  ...activeBuilderFlow,
                  steps
                });
                toast.success('Flow updated successfully!');
              }
              setActiveBuilderFlow(null);
              flowsAPI.getAll(clientId).then(r => setFlows(r.data.data));
            } catch (err) {
              toast.error('Failed to save flow');
            }
          }}
          onClose={() => setActiveBuilderFlow(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Automation Flows</h2>
        <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>+ Create Flow</button>
      </div>

      {showForm && (
        <div style={{ ...card, borderColor: 'rgba(0,212,255,0.3)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>New flow</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={{ fontSize: 11, color: '#888' }}>Flow name *</label><input style={inp} placeholder="e.g. Welcome flow" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, color: '#888' }}>Platform</label>
              <select style={inp} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                <option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option>
              </select>
            </div>
          </div>
          <label style={{ fontSize: 11, color: '#888' }}>Trigger keyword</label>
          <input style={inp} placeholder="e.g. price, hello, order" value={form.trigger_value} onChange={e => setForm({ ...form, trigger_value: e.target.value })} />
          <label style={{ fontSize: 11, color: '#888' }}>Flow reply message *</label>
          <textarea 
            style={{ ...inp, height: 60, resize: 'vertical' }} 
            placeholder="Type your reply message here (or generate using the AI option below)" 
            value={aiMsg} 
            onChange={e => setAiMsg(e.target.value)} 
          />

          <label style={{ fontSize: 11, color: '#888' }}>AI generate reply message (Optional)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input style={{ ...inp, marginBottom: 0, flex: 1 }} placeholder="Describe what you want the AI to write..." value={aiInp} onChange={e => setAiInp(e.target.value)} />
            <button style={btnPrimary} onClick={genAiMsg}>AI</button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnPrimary} onClick={save}>Save Flow</button>
            <button 
              style={{ ...btnPrimary, background: 'linear-gradient(90deg,#9333EA,#EC4899)', color: '#fff' }} 
              onClick={() => {
                if (!form.name) return toast.error('Flow name required');
                setActiveBuilderFlow({ isNew: true, name: form.name, platform: form.platform, trigger_value: form.trigger_value, steps: null });
                setShowForm(false);
              }}
            >
              Design Visually ✏️
            </button>
            <button style={{ ...btn, border: '0.5px solid #e5e7eb' }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {flows.map(flow => (
        <div key={flow.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{flow.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Trigger: "{flow.trigger_value}" · {flow.platform} · {flow.total_triggered} triggered</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: flow.is_active ? '#EAF3DE' : '#f0f0f0', color: flow.is_active ? '#27500A' : '#888' }}>{flow.is_active ? 'Active' : 'Paused'}</span>
              <button 
                style={{ ...btn, fontSize: 11, border: '0.5px solid #a855f7', color: '#6b21a8', padding: '4px 10px', fontWeight: 'bold' }} 
                onClick={() => setActiveBuilderFlow(flow)}
              >
                🎨 Visual Builder
              </button>
              <button style={{ ...btn, fontSize: 11, border: '0.5px solid #e5e7eb', padding: '4px 10px' }} onClick={() => editingFlow === flow.id ? setEditingFlow(null) : startEdit(flow)}>{editingFlow === flow.id ? 'Cancel' : '✏️ Edit'}</button>
              <button style={{ ...btn, fontSize: 11, border: '0.5px solid #e5e7eb', padding: '4px 10px' }} onClick={() => toggleActive(flow)}>{flow.is_active ? 'Pause' : 'Activate'}</button>
              <button style={{ ...btn, fontSize: 11, border: '0.5px solid #fca5a5', color: '#991b1b', padding: '4px 10px' }} onClick={() => deleteFlow(flow.id)}>Delete</button>
            </div>
          </div>

          {editingFlow === flow.id && (
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: '#0a0f1e' }}>Edit Flow</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: '#888' }}>Flow name *</label><input style={inp} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div><label style={{ fontSize: 11, color: '#888' }}>Platform</label>
                  <select style={inp} value={editForm.platform} onChange={e => setEditForm({ ...editForm, platform: e.target.value })}>
                    <option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option>
                  </select>
                </div>
              </div>
              <label style={{ fontSize: 11, color: '#888' }}>Trigger keyword</label>
              <input style={inp} value={editForm.trigger_value} onChange={e => setEditForm({ ...editForm, trigger_value: e.target.value })} />
              
              <label style={{ fontSize: 11, color: '#888' }}>Flow reply message</label>
              <textarea style={{ ...inp, height: 60, resize: 'vertical' }} value={editForm.reply_content} onChange={e => setEditForm({ ...editForm, reply_content: e.target.value })} />
              
              <label style={{ fontSize: 11, color: '#888' }}>AI generate or update reply message</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input style={{ ...inp, marginBottom: 0, flex: 1 }} placeholder="Describe changes or new reply..." value={editAiInp} onChange={e => setEditAiInp(e.target.value)} />
                <button style={btnPrimary} onClick={genEditAiMsg}>AI</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btnPrimary} onClick={() => saveEdit(flow.id)}>Save Changes</button>
                <button style={{ ...btn, border: '0.5px solid #e5e7eb' }} onClick={() => setEditingFlow(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {!flows.length && !showForm && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13 }}>No flows yet. Create your first automation!</div>
      )}
    </div>
  );
}

export default Flows;
