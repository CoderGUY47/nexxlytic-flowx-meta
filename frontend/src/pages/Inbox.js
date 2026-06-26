import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { contactsAPI, messagesAPI, metaAPI } from '../services/api';
import toast from 'react-hot-toast';

const renderMessageContent = (content, onButtonClick) => {
  if (!content) return null;
  
  // 1. Comment indicators
  if (content.startsWith('Comment:')) {
    return (
      <div>
        <span style={{ fontSize: '10px', color: '#00D4FF', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>📝 Instagram Comment</span>
        <span style={{ fontStyle: 'italic' }}>{content.replace('Comment:', '')}</span>
      </div>
    );
  }
  
  // 2. Action or system messages
  if (content.startsWith('[') && content.endsWith(']')) {
    return (
      <span style={{ color: '#64748b', fontStyle: 'italic', fontWeight: '500' }}>
        {content}
      </span>
    );
  }
  
  // 3. Try to parse JSON templates
  if (content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      
      // WhatsApp interactive replies
      if (parsed.type === 'interactive' && parsed.interactive) {
        const text = parsed.interactive.body?.text || '';
        const buttons = parsed.interactive.action?.buttons || [];
        return (
          <div>
            <div>{text}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {buttons.map((btn, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onButtonClick && onButtonClick(btn.reply?.title, btn.reply?.id, 'whatsapp_reply')}
                  style={{ fontSize: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '8px', color: '#0f172a', fontWeight: '600', cursor: 'pointer', outline: 'none', transition: 'all 0.15s', textAlign: 'center', width: '100%' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.borderColor = '#94a3b8'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; }}
                >
                  🔘 {btn.reply?.title || ''}
                </button>
              ))}
            </div>
          </div>
        );
      }
      
      // Meta Quick Replies
      if (parsed.quick_replies) {
        return (
          <div>
            <div>{parsed.text}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {parsed.quick_replies.map((qr, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onButtonClick && onButtonClick(qr.title, qr.payload, 'quick_reply')}
                  style={{ fontSize: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '8px', color: '#0f172a', fontWeight: '600', cursor: 'pointer', outline: 'none', transition: 'all 0.15s', textAlign: 'center', width: '100%' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.borderColor = '#94a3b8'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; }}
                >
                  🔘 {qr.title}
                </button>
              ))}
            </div>
          </div>
        );
      }
      
      // Meta Generic Template
      if (parsed.attachment?.payload?.template_type === 'generic') {
        const element = parsed.attachment.payload.elements?.[0] || {};
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', maxWidth: '320px' }}>
            {element.image_url && (
              <img src={element.image_url} alt="card" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '6px' }} />
            )}
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#0a0f1e', lineHeight: 1.4, wordBreak: 'break-word' }}>{element.title}</div>
            {element.subtitle && <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.35, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{element.subtitle}</div>}
            {element.buttons && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {element.buttons.map((btn, idx) => {
                  const isUrl = btn.type === 'web_url';
                  return isUrl ? (
                    <a key={idx} href={btn.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                      <div 
                        style={{ fontSize: '13px', textAlign: 'center', background: 'linear-gradient(135deg,#00D4FF,#0099BB)', padding: '10px 14px', borderRadius: '8px', color: '#ffffff', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s', boxShadow: '0 2px 8px rgba(0,212,255,0.25)', letterSpacing: '0.01em' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        🎁 {btn.title}
                      </div>
                    </a>
                  ) : (
                    <button 
                      key={idx} 
                      onClick={() => onButtonClick && onButtonClick(btn.title, btn.payload, 'postback')}
                      style={{ width: '100%', fontSize: '13px', textAlign: 'center', background: '#0a0f1e', border: 'none', padding: '10px 14px', borderRadius: '8px', color: '#ffffff', fontWeight: '700', cursor: 'pointer', outline: 'none', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#0a0f1e'}
                    >
                      🔘 {btn.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
    } catch (e) {
      // Return raw string if JSON parsing fails
    }
  }
  
  // Default raw text rendering
  return <span>{content}</span>;
};

export default function Inbox() {
  const clientId = localStorage.getItem('nxf_client') || '';
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [platform, setPlatform] = useState('whatsapp');
  const [hoveredContactId, setHoveredContactId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isSimulateMode, setIsSimulateMode] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const handleSimulatedButtonClick = async (title, payload, type) => {
    if (!selected || !clientId) return;
    
    const toastId = toast.loading('Simulating customer button tap...');
    try {
      // Append click event locally so user sees it in their dashboard thread immediately
      setMessages(prev => [...prev, {
        direction: 'inbound',
        content: `[Button Tapped: ${title}]`,
        created_at: new Date()
      }]);
      
      if (selected.platform === 'whatsapp' || type === 'whatsapp_reply') {
        const webhookPayload = {
          object: 'whatsapp_business_account',
          entry: [
            {
              id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                      display_phone_number: '16505553333',
                      phone_number_id: '1234567890'
                    },
                    messages: [
                      {
                        from: selected.phone || selected.platform_id || '16505551234',
                        id: `wamid.${Math.random().toString(36).substring(7)}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: 'interactive',
                        interactive: {
                          type: 'button_reply',
                          button_reply: {
                            id: payload,
                            title: title
                          }
                        }
                      }
                    ]
                  },
                  field: 'messages'
                }
              ]
            }
          ]
        };
        await metaAPI.simulateWhatsAppWebhook(webhookPayload, clientId);
      } else {
        // Create webhook payload imitating Instagram platform events
        let webhookPayload = {
          object: 'instagram',
          entry: [
            {
              id: '17841480208650969',
              changes: [
                {
                  field: type === 'postback' ? 'messaging_postbacks' : 'messages',
                  value: type === 'postback' ? {
                    from: { id: selected.phone || selected.platform_id || 'onepyz_test_id' },
                    postback: {
                      title: title,
                      payload: payload
                    }
                  } : {
                    from: { id: selected.phone || selected.platform_id || 'onepyz_test_id' },
                    message: {
                      text: title,
                      quick_reply: {
                        payload: payload
                      }
                    }
                  }
                }
              ]
            }
          ]
        };
        await metaAPI.simulateCommentWebhook(webhookPayload, clientId);
      }
      
      toast.success('Simulation response received!', { id: toastId });
      
      // Reload messages list
      setTimeout(async () => {
        const r = await messagesAPI.getAll({ client_id: clientId, contact_id: selected.id });
        setMessages(r.data.data);
      }, 500);
    } catch (err) {
      toast.error('Simulation failed', { id: toastId });
    }
  };

  useEffect(() => {
    if (!clientId) return;
    contactsAPI.getAll({ client_id: clientId, limit: 50 }).then(r => setContacts(r.data.data));

    const isServerless = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

    if (isServerless) {
      // Fallback polling for serverless environments (Vercel) since they don't support persistent WebSockets
      const interval = setInterval(async () => {
        try {
          const rContacts = await contactsAPI.getAll({ client_id: clientId, limit: 50 });
          setContacts(rContacts.data.data);
          
          if (selected?.id) {
            const rMsgs = await messagesAPI.getAll({ client_id: clientId, contact_id: selected.id });
            setMessages(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(rMsgs.data.data)) {
                return rMsgs.data.data;
              }
              return prev;
            });
          }
        } catch (e) {
          console.error("Polling failed:", e);
        }
      }, 5000);

      return () => clearInterval(interval);
    } else {
      // Socket.io real-time
      // Socket.io real-time - must connect to backend, not React dev server
      const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
      socketRef.current = io(SOCKET_URL);
      socketRef.current.emit('join_client', clientId);
      socketRef.current.on('new_message', (msg) => {
        if (msg.contact_id === selected?.id) {
          setMessages(prev => [...prev, {
            direction: msg.direction || 'inbound',
            content: msg.message,
            created_at: new Date()
          }]);
        }
        toast(`New message from ${msg.contact_name || 'contact'}`, { icon: '💬' });
        // Refresh contact list so new contacts appear
        contactsAPI.getAll({ client_id: clientId, limit: 50 }).then(r => setContacts(r.data.data));
      });

      return () => socketRef.current?.disconnect();
    }
  }, [clientId, selected?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const deleteContact = async (e, contactId) => {
    e.stopPropagation();
    setDeletingId(contactId);
    try {
      await contactsAPI.delete(contactId);
      setContacts(prev => prev.filter(c => c.id !== contactId));
      if (selected?.id === contactId) {
        setSelected(null);
        setMessages([]);
      }
      toast.success('Contact deleted');
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const openContact = async (contact) => {
    setSelected(contact);
    setPlatform(contact.platform);
    const r = await messagesAPI.getAll({ client_id: clientId, contact_id: contact.id });
    setMessages(r.data.data);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selected) return;
    const text = input;
    setInput('');
    
    if (isSimulateMode) {
      // Simulate as an inbound message from the customer
      setMessages(prev => [...prev, { direction: 'inbound', content: text, created_at: new Date() }]);
      
      const isWhatsApp = selected.platform === 'whatsapp';
      
      const webhookPayload = isWhatsApp ? {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '16505553333',
                    phone_number_id: '1234567890'
                  },
                  messages: [
                    {
                      from: selected.phone || selected.platform_id || '16505551234',
                      id: `wamid.${Math.random().toString(36).substring(7)}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      text: {
                        body: text
                      },
                      type: 'text'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      } : {
        object: 'instagram',
        entry: [
          {
            id: '17841480208650969',
            changes: [
              {
                field: 'messages',
                value: {
                  from: { id: selected.phone || selected.platform_id || 'onepyz_test_id' },
                  message: {
                    text: text
                  }
                }
              }
            ]
          }
        ]
      };
      
      const toastId = toast.loading(isWhatsApp ? 'Simulating WhatsApp customer message...' : 'Simulating customer text message...');
      try {
        if (isWhatsApp) {
          await metaAPI.simulateWhatsAppWebhook(webhookPayload, clientId);
        } else {
          await metaAPI.simulateCommentWebhook(webhookPayload, clientId);
        }
        toast.success('Simulation response received!', { id: toastId });
        
        // Reload messages list after a brief delay
        setTimeout(async () => {
          const r = await messagesAPI.getAll({ client_id: clientId, contact_id: selected.id });
          setMessages(r.data.data);
        }, 500);
      } catch (err) {
        toast.error('Simulation failed', { id: toastId });
      }
    } else {
      // Send standard admin reply
      setMessages(prev => [...prev, { direction: 'outbound', content: text, created_at: new Date() }]);
      try {
        await messagesAPI.send({
          client_id: clientId,
          contact_id: selected.id,
          to: selected.phone || selected.platform_id,
          platform: selected.platform,
          message: text
        });
      } catch (err) {
        toast.error('Send failed');
      }
    }
  };

  const platColor = (p) => ({ whatsapp: '#25D366', instagram: '#E1306C', facebook: '#1877F2' }[p] || '#888');

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Contact list */}
      <div style={{ width: 240, borderRight: '0.5px solid #e5e7eb', overflowY: 'auto', background: '#fff' }}>
        <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #e5e7eb', fontWeight: 500, fontSize: 14 }}>Inbox</div>
        <div style={{ padding: 8 }}>
          <input placeholder="Search..." style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, boxSizing: 'border-box', fontFamily: 'Inter,sans-serif' }} />
        </div>
        {contacts.map(c => (
          <div
            key={c.id}
            onClick={(e) => {
              if (e.target.closest('button')) return;
              openContact(c);
            }}
            onMouseEnter={() => setHoveredContactId(c.id)}
            onMouseLeave={() => setHoveredContactId(null)}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              borderBottom: '0.5px solid #f5f5f5',
              background: selected?.id === c.id ? '#f0f9ff' : hoveredContactId === c.id ? '#f8fafc' : '#fff',
              position: 'relative',
              transition: 'background 0.15s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#0a0f1e', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || 'Unknown'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: platColor(c.platform) + '20', color: platColor(c.platform), fontWeight: 600 }}>
                  {c.platform?.toUpperCase().slice(0,2)}
                </span>
                 {/* Delete icon — visible on hover and touch */}
                 <button
                   onClick={(e) => deleteContact(e, c.id)}
                   title="Delete contact"
                   disabled={deletingId === c.id}
                   style={{
                     background: 'none',
                     border: 'none',
                     cursor: deletingId === c.id ? 'wait' : 'pointer',
                     padding: '2px 4px',
                     borderRadius: 4,
                     lineHeight: 1,
                     display: 'flex',
                     opacity: hoveredContactId === c.id ? 1 : 0.3,
                     transition: 'opacity 0.2s',
                     color: '#ef4444',
                     fontSize: 13,
                     alignItems: 'center',
                     justifyContent: 'center'
                   }}
                   onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                   onMouseLeave={e => e.currentTarget.style.background = 'none'}
                 >
                   {deletingId === c.id ? '⏳' : '🗑️'}
                 </button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#8892a4', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.phone || c.username || c.platform_id}
            </div>
          </div>
        ))}
      </div>

      {/* Chat area */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
          style={{ padding: '12px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, background: '#0a0f1e' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#00D4FF', fontSize: 13 }}>
              {(selected.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: '#8892a4' }}>{selected.platform} · {selected.lead_status}</div>
            </div>
            {/* Open WhatsApp */}
            {selected.platform === 'whatsapp' && selected.phone && (
              <a
                href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: 14 }}>💬</span> Open WhatsApp
                </button>
              </a>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: '#f8f9fa' }}>
            {messages.map((m, i) => {
              const isTemplate = m.content && m.content.trim().startsWith('{');
              return (
                <div key={i} style={{ alignSelf: m.direction === 'outbound' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                  <div style={isTemplate ? {
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: 13,
                    lineHeight: 1.5,
                    background: '#ffffff',
                    color: '#0a0f1e',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  } : {
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: 13,
                    lineHeight: 1.5,
                    background: m.direction === 'outbound' ? 'linear-gradient(135deg,#00D4FF,#0099BB)' : '#fff',
                    color: m.direction === 'outbound' ? '#fff' : '#0a0f1e',
                    border: m.direction === 'inbound' ? '0.5px solid #e5e7eb' : 'none'
                  }}>
                    {renderMessageContent(m.content, handleSimulatedButtonClick)}
                  </div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2, textAlign: m.direction === 'outbound' ? 'right' : 'left' }}>
                    {new Date(m.created_at).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '10px 14px', borderTop: '0.5px solid #e5e7eb', display: 'flex', gap: 8, background: '#fff', alignItems: 'center' }}>
            <button
              onClick={() => setIsSimulateMode(!isSimulateMode)}
              title={isSimulateMode ? "Currently in Customer Simulation mode (messages will be sent from customer to bot)" : "Currently in Admin Reply mode (messages will be sent from bot to customer)"}
              style={{
                padding: '9px 12px',
                background: isSimulateMode ? 'linear-gradient(135deg,#9333EA,#EC4899)' : '#f1f5f9',
                color: isSimulateMode ? '#fff' : '#64748b',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: isSimulateMode ? '0 2px 4px rgba(147, 51, 234, 0.2)' : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {isSimulateMode ? '⚡ Customer Sim' : '👤 Admin Mode'}
            </button>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={isSimulateMode ? "Type simulated message from customer..." : `Reply via ${selected.platform}...`}
              style={{ flex: 1, padding: '9px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'Inter,sans-serif' }}
            />
            <button onClick={sendMessage} style={{ padding: '9px 18px', background: 'linear-gradient(90deg,#00D4FF,#39FF14)', border: 'none', borderRadius: 8, color: '#0a0f1e', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {isSimulateMode ? 'Simulate' : 'Send'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8892a4', fontSize: 13 }}>
          Select a contact to start chatting
        </div>
      )}
    </div>
  );
}
