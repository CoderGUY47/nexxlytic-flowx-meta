import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '0.5px solid rgba(0,212,255,0.2)', background: 'rgba(255,255,255,0.04)',
  color: '#fff', fontSize: 13, fontFamily: 'Inter,sans-serif',
  outline: 'none', boxSizing: 'border-box', marginBottom: 12
};

const btnStyle = {
  width: '100%', padding: '11px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(90deg,#00D4FF,#39FF14)', color: '#0a0f1e',
  fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter,sans-serif'
};

export default function Login() {
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(form.email, form.password);
    if (!res.success) toast.error(res.error);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, padding: 36, background: '#0d1526', borderRadius: 16, border: '0.5px solid rgba(0,212,255,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#39FF14,#00D4FF)', borderRadius: 12, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#0a0f1e' }}>N</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>NEXXLYTIC <span style={{ color: '#00D4FF' }}>FlowX</span></div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>Sign in to your agency account</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 6 }}>Email</div>
          <input style={inputStyle} type="email" placeholder="you@agency.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 6 }}>Password</div>
          <input style={inputStyle} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <button style={btnStyle} type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#4a5568' }}>
          No account? <Link to="/signup" style={{ color: '#00D4FF' }}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
