import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const NAV = [
  { path: '/', label: 'Dashboard', icon: '⊞', exact: true },
  { path: '/inbox', label: 'Inbox', icon: '✉', badge: true },
  { path: '/flows', label: 'Flows', icon: '▶' },
  { path: '/keywords', label: 'Keywords', icon: '#' },
  { path: '/broadcasts', label: 'Broadcast', icon: '📢' },
  { path: '/contacts', label: 'Contacts', icon: '👥' },
  { path: '/analytics', label: 'Analytics', icon: '📊' },
  { path: '/instagram', label: 'Instagram', icon: '📸' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;

    // Connect to global socket
    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || '');

    socket.emit('join_user', user.id);

    socket.on('flow_triggered', (data) => {
      const activeClient = localStorage.getItem('nxf_client');
      if (data.client_id !== activeClient) {
        toast((t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 600, color: '#00D4FF' }}>🤖 Flow Triggered!</span>
            <span>
              Flow <b>{data.flow_name}</b> was triggered for client <b>{data.client_name}</b> (which is not your active client).
            </span>
            <button 
              onClick={() => {
                localStorage.setItem('nxf_client', data.client_id);
                toast.dismiss(t.id);
                toast.success(`Switched to client: ${data.client_name}`);
                setTimeout(() => {
                  window.location.reload();
                }, 800);
              }}
              style={{
                alignSelf: 'flex-start',
                background: 'linear-gradient(90deg,#00D4FF,#39FF14)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#0a0f1e',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Switch Client & Reload 🔄
            </button>
          </div>
        ), {
          duration: 10000,
          id: `flow_trigger_${data.client_id}`
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif', background: '#f8f9fa' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#0a0f1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#39FF14,#00D4FF)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#0a0f1e' }}>N</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>NEXXLYTIC</div>
              <div style={{ fontSize: 10, color: '#00D4FF', letterSpacing: 2 }}>FLOWX</div>
            </div>
          </div>
        </div>

        {/* Client selector */}
        <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Agency</div>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{user?.agency_name || 'My Agency'}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', fontSize: 13,
                color: isActive ? '#00D4FF' : '#8892a4',
                borderLeft: isActive ? '2px solid #00D4FF' : '2px solid transparent',
                background: isActive ? 'rgba(0,212,255,0.07)' : 'transparent',
                textDecoration: 'none', fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s'
              })}
            >
              <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User / logout */}
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 12, color: '#8892a4', marginBottom: 4 }}>{user?.email}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, background: 'rgba(0,212,255,0.15)', color: '#00D4FF', padding: '2px 8px', borderRadius: 20 }}>{user?.plan}</span>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 12 }}>Logout</button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  );
}
