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

export default function Signup() {
  const { signup, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', agency_name: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await signup(form);
    if (!res.success) toast.error(res.error);
    else toast.success('Account created! Welcome to FlowX!');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 400, padding: 36, background: '#0d1526', borderRadius: 16, border: '0.5px solid rgba(0,212,255,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#39FF14,#00D4FF)', borderRadius: 12, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#0a0f1e' }}>N</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Create your account</div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>Start automating your social media</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 6 }}>Full Name</div>
          <input style={inputStyle} placeholder="Ahmed Khan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 6 }}>Agency Name</div>
          <input style={inputStyle} placeholder="Style Hub Agency" value={form.agency_name} onChange={e => setForm({ ...form, agency_name: e.target.value })} />
          <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 6 }}>Email</div>
          <input style={inputStyle} type="email" placeholder="you@agency.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 6 }}>Password</div>
          <input style={inputStyle} type="password" placeholder="Min 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <button style={btnStyle} type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#4a5568' }}>
          Already have an account? <Link to="/login" style={{ color: '#00D4FF' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
