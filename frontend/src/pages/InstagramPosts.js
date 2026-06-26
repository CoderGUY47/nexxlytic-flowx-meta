import React, { useEffect, useState } from 'react';
import { metaAPI, keywordsAPI } from '../services/api';
import toast from 'react-hot-toast';

const card = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 };
const inp = { width: '100%', padding: '8px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box', marginBottom: 10 };
const btnPrimary = { padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: 'linear-gradient(90deg,#00D4FF,#39FF14)', color: '#0a0f1e', fontWeight: 700, fontFamily: 'Inter,sans-serif' };

export default function InstagramPosts() {
  const clientId = localStorage.getItem('nxf_client') || '';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishForm, setPublishForm] = useState({ image_url: '', caption: '' });
  const [publishing, setPublishing] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [kwForm, setKwForm] = useState({ keyword: '', reply_text: '', postId: null });
  const [showKwFor, setShowKwFor] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [clientKeywords, setClientKeywords] = useState([]);
  const [postComments, setPostComments] = useState({});
  const [showCommentsFor, setShowCommentsFor] = useState(null);
  const [loadingComments, setLoadingComments] = useState({});

  const loadKeywords = () => {
    if (!clientId) return;
    keywordsAPI.getAll(clientId)
      .then(r => setClientKeywords(r.data.data || []))
      .catch(err => console.error('Could not load keywords:', err));
  };

  useEffect(() => {
    metaAPI.getPosts()
      .then(r => setPosts(r.data.data || []))
      .catch((err) => {
        const errObj = err.response?.data?.error;
        const errMsg = typeof errObj === 'object'
          ? (errObj?.error?.message || errObj?.message || JSON.stringify(errObj))
          : errObj || err.message;
        toast.error(`Could not load posts: ${errMsg || 'Check your Meta token in Settings.'}`);
      })
      .finally(() => setLoading(false));

    loadKeywords();
  }, [clientId]);

  const publishPost = async () => {
    if (!publishForm.image_url) return toast.error('Image URL is required');
    setPublishing(true);
    try {
      await metaAPI.publishPost(publishForm);
      toast.success('Post published to Instagram!');
      setPublishForm({ image_url: '', caption: '' });
      setShowPublish(false);
      const r = await metaAPI.getPosts();
      setPosts(r.data.data || []);
    } catch (err) {
      const errObj = err.response?.data?.error;
      const errMsg = typeof errObj === 'object'
        ? (errObj?.error?.message || errObj?.message || JSON.stringify(errObj))
        : errObj || err.message;
      toast.error(`Publish failed: ${errMsg}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleEditPost = async (postId) => {
    if (!editCaptionText.trim()) return toast.error('Caption cannot be empty');
    try {
      await metaAPI.editPost(postId, { caption: editCaptionText });
      toast.success('Caption updated successfully!');
      setEditingPostId(null);
      setEditCaptionText('');
      const r = await metaAPI.getPosts();
      setPosts(r.data.data || []);
    } catch (err) {
      toast.error('Failed to update caption');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await metaAPI.deletePost(postId);
      toast.success('Post deleted successfully!');
      const r = await metaAPI.getPosts();
      setPosts(r.data.data || []);
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const saveKeyword = async () => {
    if (!kwForm.keyword || !kwForm.reply_text) return toast.error('Keyword and reply are required');
    if (!clientId) return toast.error('Select a client in Settings first');
    
    try {
      const existing = clientKeywords.find(k => k.post_id === kwForm.postId);
      if (existing) {
        await keywordsAPI.update(existing.id, {
          keyword: kwForm.keyword,
          reply_text: kwForm.reply_text,
          is_active: 1
        });
        toast.success('Keyword trigger updated successfully!');
      } else {
        await keywordsAPI.create({
          client_id: clientId,
          keyword: kwForm.keyword,
          platform: 'instagram',
          reply_text: kwForm.reply_text,
          match_type: 'contains',
          post_id: kwForm.postId
        });
        toast.success('Keyword trigger saved! Comments with this word will get an auto-reply.');
      }
      loadKeywords();
      setKwForm({ keyword: '', reply_text: '', postId: null });
      setShowKwFor(null);
    } catch (err) {
      toast.error('Failed to save keyword trigger');
    }
  };

  const toggleComments = async (postId) => {
    if (showCommentsFor === postId) {
      setShowCommentsFor(null);
      return;
    }
    setShowCommentsFor(postId);
    if (!postComments[postId]) {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      try {
        const r = await metaAPI.getComments(postId);
        setPostComments(prev => ({ ...prev, [postId]: r.data.data || [] }));
      } catch (err) {
        toast.error('Failed to load comments');
      } finally {
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Instagram Posts</h2>
        <button style={btnPrimary} onClick={() => setShowPublish(!showPublish)}>+ Publish New Post</button>
      </div>

      {showPublish && (
        <div style={{ ...card, background: '#f8f9fa' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Publish to Instagram</div>
          <label style={{ fontSize: 11, color: '#888' }}>Public Image URL *</label>
          <input style={inp} placeholder="https://example.com/image.jpg" value={publishForm.image_url} onChange={e => setPublishForm({ ...publishForm, image_url: e.target.value })} />
          <label style={{ fontSize: 11, color: '#888' }}>Caption</label>
          <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} placeholder="Write your caption..." value={publishForm.caption} onChange={e => setPublishForm({ ...publishForm, caption: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnPrimary} onClick={publishPost} disabled={publishing}>{publishing ? 'Publishing...' : 'Publish'}</button>
            <button style={{ padding: '8px 14px', border: '0.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: '#fff' }} onClick={() => setShowPublish(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13 }}>Loading posts...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {posts.map(post => (
          <div key={post.id} style={card}>
            {post.media_url && (
              <img
                src={post.media_url}
                alt={post.caption || 'Instagram post'}
                style={{ width: '100%', borderRadius: 8, marginBottom: 10, objectFit: 'cover', maxHeight: 200 }}
              />
            )}
            
            {editingPostId === post.id ? (
              <div style={{ marginBottom: 8 }}>
                <textarea
                  style={{ ...inp, minHeight: 60, fontSize: 12, marginBottom: 6, resize: 'vertical' }}
                  value={editCaptionText}
                  onChange={e => setEditCaptionText(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    style={{ ...btnPrimary, fontSize: 11, padding: '4px 10px' }}
                    onClick={() => handleEditPost(post.id)}>
                    Save
                  </button>
                  <button
                    style={{ padding: '4px 10px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer' }}
                    onClick={() => { setEditingPostId(null); setEditCaptionText(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#444', marginBottom: 8, lineHeight: 1.5 }}>
                {post.caption ? post.caption.slice(0, 120) + (post.caption.length > 120 ? '...' : '') : 'No caption'}
              </div>
            )}

            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 10 }}>
              {new Date(post.timestamp).toLocaleDateString()}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <a href={post.permalink} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#f0f9ff', color: '#00D4FF', textDecoration: 'none', border: '0.5px solid #00D4FF' }}>
                View
              </a>
              <button
                onClick={() => toggleComments(post.id)}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: showCommentsFor === post.id ? 'rgba(0, 212, 255, 0.15)' : 'transparent', color: '#00D4FF', border: '0.5px solid #00D4FF', cursor: 'pointer' }}>
                💬 Comments ({postComments[post.id]?.length || 0})
              </button>
              <button
                onClick={() => {
                  const isOpen = showKwFor === post.id;
                  setShowKwFor(isOpen ? null : post.id);
                  if (!isOpen) {
                    const existing = clientKeywords.find(k => k.post_id === post.id);
                    setKwForm({
                      keyword: existing ? existing.keyword : '',
                      reply_text: existing ? existing.reply_text : '',
                      postId: post.id
                    });
                  }
                }}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: showKwFor === post.id ? 'linear-gradient(90deg,#00D4FF,#39FF14)' : 'transparent', color: showKwFor === post.id ? '#0a0f1e' : '#8892a4', border: '0.5px solid #e5e7eb', cursor: 'pointer', fontWeight: showKwFor === post.id ? 700 : 400 }}>
                # Set Keyword
              </button>
              <button
                onClick={() => {
                  setEditingPostId(post.id);
                  setEditCaptionText(post.caption || '');
                }}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'transparent', color: '#6b7280', border: '0.5px solid #e5e7eb', cursor: 'pointer' }}>
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDeletePost(post.id)}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'transparent', color: '#ef4444', border: '0.5px solid #fee2e2', cursor: 'pointer' }}>
                🗑️ Delete
              </button>
            </div>

            {showCommentsFor === post.id && (
              <div style={{ marginTop: 10, padding: 12, background: '#f9fafb', borderRadius: 8, border: '0.5px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Comments</span>
                  <button 
                    onClick={async () => {
                      setLoadingComments(prev => ({ ...prev, [post.id]: true }));
                      try {
                        const r = await metaAPI.getComments(post.id);
                        setPostComments(prev => ({ ...prev, [post.id]: r.data.data || [] }));
                        toast.success('Comments refreshed!');
                      } catch (err) {
                        toast.error('Failed to refresh comments');
                      } finally {
                        setLoadingComments(prev => ({ ...prev, [post.id]: false }));
                      }
                    }}
                    style={{ fontSize: 10, border: 'none', background: 'transparent', color: '#00D4FF', cursor: 'pointer' }}>
                    🔄 Refresh
                  </button>
                </div>
                {loadingComments[post.id] ? (
                  <div style={{ fontSize: 11, color: '#888', textAlign: 'center', padding: 8 }}>Loading...</div>
                ) : !postComments[post.id] || postComments[post.id].length === 0 ? (
                  <div style={{ fontSize: 11, color: '#888', textAlign: 'center', padding: 8 }}>No comments found on this post.</div>
                ) : (
                  <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {postComments[post.id].map(comment => (
                      <div key={comment.id} style={{ fontSize: 11, borderBottom: '1px solid #f3f4f6', paddingBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, color: '#4b5563' }}>
                            @{comment.from?.username || comment.from?.id || 'User'}
                          </span>
                          <span style={{ fontSize: 9, color: '#9ca3af' }}>
                            {new Date(comment.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <div style={{ color: '#1f2937' }}>{comment.text}</div>
                          <button
                            onClick={async () => {
                              try {
                                const payload = {
                                  object: 'instagram',
                                  entry: [
                                    {
                                      id: '17841480208650969',
                                      changes: [
                                        {
                                          field: 'comments',
                                          value: {
                                            id: comment.id,
                                            text: comment.text,
                                            from: {
                                              id: comment.from?.id || 'onepyz_test_id'
                                            },
                                            media: {
                                              id: post.id
                                            }
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                };
                                await metaAPI.simulateCommentWebhook(payload, clientId);
                                toast.success('Webhook simulation triggered! Check the Inbox page.');
                              } catch (err) {
                                toast.error('Failed to trigger webhook simulation');
                              }
                            }}
                            style={{ fontSize: 9, padding: '2px 6px', border: '0.5px solid #00D4FF', borderRadius: 4, background: '#f0f9ff', color: '#00D4FF', cursor: 'pointer', fontWeight: 600 }}>
                            ⚡ Test Reply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showKwFor === post.id && (
              <div style={{ marginTop: 10, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                  Comments containing this keyword will trigger an auto-reply + WhatsApp DM
                </div>
                <input style={{ ...inp, marginBottom: 6 }} placeholder='Keyword e.g. "price"' value={kwForm.keyword} onChange={e => setKwForm({ ...kwForm, keyword: e.target.value })} />
                <textarea style={{ ...inp, minHeight: 55, resize: 'vertical' }} placeholder="Auto-reply text..." value={kwForm.reply_text} onChange={e => setKwForm({ ...kwForm, reply_text: e.target.value })} />
                <button style={{ ...btnPrimary, fontSize: 12, padding: '6px 14px' }} onClick={saveKeyword}>Save Trigger</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && !posts.length && (
        <div style={{ ...card, textAlign: 'center', padding: 32, color: '#888', fontSize: 13 }}>
          No posts found. Check your <strong>META_PAGE_ACCESS_TOKEN</strong> in the server .env file.
        </div>
      )}
    </div>
  );
}
