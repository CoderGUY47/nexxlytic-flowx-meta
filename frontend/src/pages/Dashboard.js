import React, { useEffect, useState } from 'react';
import { analyticsAPI, aiAPI } from '../services/api';
import toast from 'react-hot-toast';

const card = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', marginBottom: 12 };
const metric = { background: '#f8f9fa', borderRadius: 8, padding: 14, textAlign: 'center' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [clientId, setClientId] = useState(localStorage.getItem('nxf_client') || '');
  const [aiMsg, setAiMsg] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      analyticsAPI.getSummary(clientId)
        .then(r => setStats(r.data.data))
        .catch(() => {});
    }
  }, [clientId]);

  const testAi = async () => {
    if (!aiMsg.trim()) return;
    setAiLoading(true);
    try {
      const r = await aiAPI.reply({ message: aiMsg, language: 'hinglish' });
      setAiReply(r.data.reply);
    } catch (err) {
      toast.error('AI error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#0a0f1e' }}>Dashboard</h2>
          <p style={{ fontSize: 12, color: '#8892a4', margin: 0 }}>Welcome to NEXXLYTIC FlowX</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#EAF3DE', color: '#27500A' }}>WA</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#FAECE7', color: '#712B13' }}>IG</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E6F1FB', color: '#0C447C' }}>FB</span>
        </div>
      </div>

      {/* Stats */}
      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Contacts', val: stats.total_contacts?.toLocaleString() },
            { label: 'Active Flows', val: stats.active_flows },
            { label: 'Open Rate', val: `${stats.open_rate}%` },
            { label: 'Revenue', val: `₹${(stats.revenue_total || 0).toLocaleString()}` },
          ].map(s => (
            <div key={s.label} style={metric}>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#0a0f1e' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#8892a4', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...card, textAlign: 'center', padding: 24 }}>
          <p style={{ color: '#8892a4', fontSize: 13 }}>Enter your Client ID in Settings to see live stats.</p>
        </div>
      )}

      {/* AI tester */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>AI Auto-reply Tester</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={aiMsg}
            onChange={e => setAiMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && testAi()}
            placeholder="Customer message likhein (e.g. price kitni hai?)"
            style={{ flex: 1, padding: '8px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'Inter,sans-serif' }}
          />
          <button
            onClick={testAi}
            disabled={aiLoading}
            style={{ padding: '8px 16px', background: 'linear-gradient(90deg,#00D4FF,#39FF14)', border: 'none', borderRadius: 8, color: '#0a0f1e', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            {aiLoading ? '...' : 'Test AI'}
          </button>
        </div>
        {aiReply && (
          <div style={{ marginTop: 10, padding: 12, background: '#0a0f1e', borderRadius: 8, fontSize: 13, color: '#39FF14', fontFamily: 'monospace' }}>
            {aiReply}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Quick Actions</div>
          {[
            ['Create Flow', '/flows'],
            ['Add Keyword', '/keywords'],
            ['Send Broadcast', '/broadcasts'],
            ['View Contacts', '/contacts'],
          ].map(([label, path]) => (
            <a key={label} href={path} style={{ display: 'block', padding: '6px 0', fontSize: 12, color: '#00D4FF', textDecoration: 'none' }}>
              → {label}
            </a>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Platform Status</div>
          {['WhatsApp', 'Instagram', 'Facebook'].map(p => (
            <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '0.5px solid #f0f0f0' }}>
              <span>{p}</span>
              <span style={{ color: '#27500A', background: '#EAF3DE', padding: '1px 8px', borderRadius: 20, fontSize: 10 }}>Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
