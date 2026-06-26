import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Analytics() {
  const clientId = localStorage.getItem('nxf_client') || '';
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [platform, setPlatform] = useState([]);

  useEffect(() => {
    if (!clientId) return;
    analyticsAPI.getSummary(clientId).then(r => setSummary(r.data.data));
    analyticsAPI.getDaily(clientId).then(r => setDaily(r.data.data));
    analyticsAPI.getPlatform(clientId).then(r => setPlatform(r.data.data));
  }, [clientId]);

  const card = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 };
  const metric = { background: '#f8f9fa', borderRadius: 8, padding: 14, textAlign: 'center' };

  const platColors = { whatsapp: '#25D366', instagram: '#E1306C', facebook: '#1877F2' };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Analytics</h2>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total contacts', val: summary.total_contacts?.toLocaleString() },
            { label: 'New this week', val: `+${summary.new_contacts_week}` },
            { label: 'Open rate', val: `${summary.open_rate}%` },
            { label: 'Revenue', val: `₹${(summary.revenue_total || 0).toLocaleString()}` },
          ].map(s => (
            <div key={s.label} style={metric}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#0a0f1e' }}>{s.val || '—'}</div>
              <div style={{ fontSize: 11, color: '#8892a4', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Messages (last 30 days)</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={daily}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#00D4FF" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Platform breakdown</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={platform}>
            <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#00D4FF" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {platform.map(p => (
        <div key={p.platform} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ textTransform: 'capitalize' }}>{p.platform}</span>
            <span style={{ fontWeight: 500 }}>{p.count}</span>
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: 4, height: 6 }}>
            <div style={{ height: 6, borderRadius: 4, background: platColors[p.platform] || '#888', width: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
