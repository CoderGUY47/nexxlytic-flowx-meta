import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const canvasStyle = {
  position: 'relative',
  width: '100%',
  height: '650px',
  background: '#fafbfc',
  backgroundImage: 'radial-gradient(circle, #e2e8f0 1.2px, transparent 1.2px)',
  backgroundSize: '24px 24px',
  overflow: 'hidden',
  userSelect: 'none',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
};

const sidebarStyle = {
  width: '320px',
  borderLeft: '1px solid #e2e8f0',
  background: '#ffffff',
  padding: '20px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  boxShadow: '-4px 0 16px rgba(0,0,0,0.02)'
};

const nodeHeaderColor = {
  trigger: 'linear-gradient(135deg, #10B981, #059669)',
  message: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  action: 'linear-gradient(135deg, #F59E0B, #D97706)'
};

export function FlowBuilderCanvas({ flow, onSave, onClose }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingHandle, setConnectingHandle] = useState(null); // { nodeId, handleId, type: 'source' }
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);

  // Initialize nodes and edges from flow steps
  useEffect(() => {
    let steps = flow.steps;
    if (typeof steps === 'string') {
      try {
        steps = JSON.parse(steps);
      } catch (e) {
        steps = null;
      }
    }

    if (steps && Array.isArray(steps.nodes)) {
      setNodes(steps.nodes);
      setEdges(steps.edges || []);
    } else {
      // Create template starting nodes for Claude flow if blank
      const defaultNodes = [
        {
          id: 'node_trigger',
          type: 'trigger',
          position: { x: 50, y: 150 },
          data: {
            type: 'keyword',
            value: flow.trigger_value || 'claude'
          }
        },
        {
          id: 'node_msg_1',
          type: 'message',
          position: { x: 350, y: 120 },
          data: {
            platform: 'instagram',
            text: 'Hey there! Glad you\'re here 😊 Tap below and I\'ll send you the access in just a moment ✨',
            quick_replies: [
              { title: 'Send me the access' }
            ],
            buttons: []
          }
        }
      ];
      
      const defaultEdges = [
        {
          id: 'edge_start',
          source: 'node_trigger',
          target: 'node_msg_1',
          sourceHandle: null
        }
      ];
      
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      setSelectedNodeId('node_msg_1');
    }
  }, [flow]);

  // Coordinates helper for drawing paths
  const getConnectorCoords = (node, type, handleId) => {
    const width = 240; 
    const x = node.position.x;
    const y = node.position.y;
    
    if (type === 'target') {
      return { x: x, y: y + 24 }; // Input handle left
    }
    
    // Output handles on the right
    if (node.type === 'trigger') {
      return { x: x + width, y: y + 24 };
    }
    
    if (node.type === 'action') {
      return { x: x + width, y: y + 30 };
    }
    
    if (node.type === 'message') {
      if (handleId && handleId.startsWith('qr_')) {
        const idx = parseInt(handleId.split('_')[1]);
        return { x: x + width, y: y + 80 + idx * 36 };
      }
      if (handleId && handleId.startsWith('btn_')) {
        const idx = parseInt(handleId.split('_')[1]);
        const qrCount = node.data?.quick_replies?.length || 0;
        return { x: x + width, y: y + 80 + qrCount * 36 + idx * 36 };
      }
      return { x: x + width, y: y + 36 };
    }
    
    return { x: x + width, y: y + 24 };
  };

  // Dragging nodes
  const handleMouseDownNode = (e, nodeId) => {
    if (e.target.closest('.no-drag')) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - node.position.x;
    const y = e.clientY - rect.top - node.position.y;
    setDragOffset({ x, y });
    e.stopPropagation();
  };

  const handleMouseMoveCanvas = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (draggingNodeId) {
      setNodes(prev => prev.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            position: {
              x: Math.max(0, Math.min(x - dragOffset.x, 2000)),
              y: Math.max(0, Math.min(y - dragOffset.y, 2000))
            }
          };
        }
        return n;
      }));
    }
  };

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
    setConnectingHandle(null);
  };

  // Connection handling
  const handleMouseDownConnector = (e, nodeId, handleId) => {
    setConnectingHandle({ nodeId, handleId });
    const node = nodes.find(n => n.id === nodeId);
    const coords = getConnectorCoords(node, 'source', handleId);
    setMousePos(coords);
    e.stopPropagation();
    e.preventDefault();
  };

  const handleMouseUpConnector = (e, nodeId) => {
    if (connectingHandle && connectingHandle.nodeId !== nodeId) {
      // Connect source to target input handle
      const newEdge = {
        id: `edge_${Date.now()}`,
        source: connectingHandle.nodeId,
        target: nodeId,
        sourceHandle: connectingHandle.handleId
      };
      
      // Prevent duplicate edges from the same handle
      setEdges(prev => {
        const filtered = prev.filter(edge => 
          !(edge.source === newEdge.source && edge.sourceHandle === newEdge.sourceHandle)
        );
        return [...filtered, newEdge];
      });
      toast.success('Connected!');
    }
    setConnectingHandle(null);
    e.stopPropagation();
  };

  // Add nodes
  const addMessageNode = () => {
    const id = `node_msg_${Date.now()}`;
    const newNode = {
      id,
      type: 'message',
      position: { x: 400, y: 200 },
      data: {
        platform: 'instagram',
        text: 'New message node content',
        quick_replies: [],
        buttons: []
      }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  const addActionNode = () => {
    const id = `node_action_${Date.now()}`;
    const newNode = {
      id,
      type: 'action',
      position: { x: 400, y: 200 },
      data: {
        action_type: 'add_tag',
        tag: 'Interested'
      }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  const deleteNode = (nodeId) => {
    if (nodeId === 'node_trigger') return toast.error("Cannot delete trigger node");
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const deleteEdge = (edgeId) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    toast.success('Connection removed');
  };

  // Property Editor updates
  const updateSelectedNodeData = (updatedData) => {
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return { ...n, data: { ...n.data, ...updatedData } };
      }
      return n;
    }));
  };

  const handleSave = () => {
    onSave({ nodes, edges });
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div style={{ display: 'flex', flex: 1, height: '650px', background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      
      {/* Visual Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Top Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={addMessageNode}
              style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#334155' }}
            >
              💬 Add Message Node
            </button>
            <button 
              onClick={addActionNode}
              style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#334155' }}
            >
              ⚡ Add Action Node
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleSave}
              style={{ padding: '8px 16px', background: 'linear-gradient(90deg,#00D4FF,#39FF14)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#0f172a' }}
            >
              💾 Save Flow
            </button>
            <button 
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#64748b' }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* The Drag Area */}
        <div 
          ref={canvasRef}
          style={canvasStyle}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
        >
          {/* SVG Overlay for Connections */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            
            {/* Draw Rendered Edges */}
            {edges.map(edge => {
              const srcNode = nodes.find(n => n.id === edge.source);
              const tgtNode = nodes.find(n => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;
              
              const p1 = getConnectorCoords(srcNode, 'source', edge.sourceHandle);
              const p2 = getConnectorCoords(tgtNode, 'target');
              
              // Smooth cubic bezier
              const path = `M ${p1.x} ${p1.y} C ${(p1.x + p2.x) / 2} ${p1.y}, ${(p1.x + p2.x) / 2} ${p2.y}, ${p2.x} ${p2.y}`;
              
              return (
                <g key={edge.id}>
                  {/* Glowing line shadow */}
                  <path 
                    d={path} 
                    fill="none" 
                    stroke="rgba(0, 212, 255, 0.15)" 
                    strokeWidth="8" 
                  />
                  {/* Main connection line */}
                  <path 
                    d={path} 
                    fill="none" 
                    stroke={selectedNodeId === edge.source ? '#00D4FF' : '#94a3b8'} 
                    strokeWidth="2.5" 
                    strokeDasharray={selectedNodeId === edge.source ? 'none' : 'none'}
                  />
                  {/* Delete button indicator overlay */}
                  <foreignObject 
                    x={(p1.x + p2.x) / 2 - 8} 
                    y={(p1.y + p2.y) / 2 - 8} 
                    width="16" 
                    height="16"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  >
                    <div 
                      onClick={() => deleteEdge(edge.id)}
                      title="Remove Connection"
                      style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                      ×
                    </div>
                  </foreignObject>
                </g>
              );
            })}

            {/* Draw Pending Line */}
            {connectingHandle && (
              (() => {
                const srcNode = nodes.find(n => n.id === connectingHandle.nodeId);
                if (!srcNode) return null;
                const p1 = getConnectorCoords(srcNode, 'source', connectingHandle.handleId);
                const path = `M ${p1.x} ${p1.y} C ${(p1.x + mousePos.x) / 2} ${p1.y}, ${(p1.x + mousePos.x) / 2} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;
                return (
                  <path 
                    d={path} 
                    fill="none" 
                    stroke="#00D4FF" 
                    strokeWidth="2" 
                    strokeDasharray="4,4" 
                  />
                );
              })()
            )}
          </svg>

          {/* Render Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            
            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                onMouseUp={(e) => handleMouseUpConnector(e, node.id)}
                style={{
                  position: 'absolute',
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                  width: '240px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #00D4FF' : '1px solid #e2e8f0',
                  boxShadow: isSelected ? '0 10px 25px rgba(0, 212, 255, 0.12)' : '0 4px 12px rgba(0, 0, 0, 0.03)',
                  zIndex: isSelected ? 5 : 2,
                  transition: 'border-color 0.15s, box-shadow 0.15s'
                }}
              >
                {/* Node Target Connector (Input) */}
                {node.type !== 'trigger' && (
                  <div 
                    title="Connect target node here"
                    style={{
                      position: 'absolute',
                      left: '-8px',
                      top: '18px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#cbd5e1',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: 'crosshair',
                      zIndex: 10
                    }}
                  />
                )}

                {/* Node Header */}
                <div 
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px 10px 0 0',
                    background: nodeHeaderColor[node.type] || '#64748b',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>
                    {node.type === 'trigger' ? '🎬 Trigger' : node.type === 'message' ? '💬 Message' : '⚡ Action'}
                  </span>
                  {node.type !== 'trigger' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                      className="no-drag"
                      style={{ background: 'none', border: 'none', color: '#ffffffcc', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Node Body */}
                <div style={{ padding: '12px' }}>
                  {node.type === 'trigger' && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>KEYWORD TRIGGER</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                        "{node.data?.value || 'N/A'}"
                      </div>
                    </div>
                  )}

                  {node.type === 'message' && (
                    <div>
                      <span style={{ fontSize: '9px', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                        {node.data?.platform || 'instagram'}
                      </span>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#334155', 
                        margin: '6px 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {node.data?.text || <i>Empty message body</i>}
                      </p>
                      
                      {/* Quick Replies Buttons list */}
                      {node.data?.quick_replies?.map((qr, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            margin: '8px 0 0 0',
                            padding: '6px 8px',
                            background: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '11px',
                            textAlign: 'center',
                            color: '#475569',
                            position: 'relative'
                          }}
                        >
                          🔘 {qr.title}
                          {/* Handle for connecting */}
                          <div 
                            onMouseDown={(e) => handleMouseDownConnector(e, node.id, `qr_${idx}`)}
                            title="Drag connection to next step"
                            style={{
                              position: 'absolute',
                              right: '-14px',
                              top: '6px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: '#3B82F6',
                              border: '2px solid #ffffff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              cursor: 'crosshair',
                              zIndex: 10
                            }}
                          />
                        </div>
                      ))}

                      {/* Postback Buttons list */}
                      {node.data?.buttons?.map((btn, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            margin: '8px 0 0 0',
                            padding: '6px 8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '11px',
                            textAlign: 'center',
                            fontWeight: '600',
                            color: '#1e293b',
                            position: 'relative'
                          }}
                        >
                          🔗 {btn.title}
                          {/* Connect handle for postbacks */}
                          {btn.type !== 'web_url' && (
                            <div 
                              onMouseDown={(e) => handleMouseDownConnector(e, node.id, `btn_${idx}`)}
                              title="Drag connection to next step"
                              style={{
                                position: 'absolute',
                                right: '-14px',
                                top: '6px',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: '#8B5CF6',
                                border: '2px solid #ffffff',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                cursor: 'crosshair',
                                zIndex: 10
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {node.type === 'action' && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>ACTION</div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginTop: '4px' }}>
                        {node.data?.action_type === 'add_tag' ? `🏷️ Add Tag: "${node.data?.tag || 'N/A'}"` : 'Action'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Node Default Source Connector (Output) */}
                {(!node.data?.quick_replies?.length && !node.data?.buttons?.length) && (
                  <div 
                    onMouseDown={(e) => handleMouseDownConnector(e, node.id, null)}
                    title="Drag connection to next step"
                    style={{
                      position: 'absolute',
                      right: '-8px',
                      top: node.type === 'action' ? '25px' : '30px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#38bdf8',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: 'crosshair',
                      zIndex: 10
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Property Editor Panel SideBar */}
      <div style={sidebarStyle}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛠️ properties</span>
        </h3>
        
        {!selectedNode ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', fontSize: '12px' }}>
            Click on a node card to view and customize its properties.
          </div>
        ) : (
          <div className="no-drag" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Node ID</label>
              <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '500', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
                {selectedNode.id}
              </div>
            </div>

            {/* TRIGGER TYPE EDITOR */}
            {selectedNode.type === 'trigger' && (
              <>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Trigger Type</label>
                  <select 
                    value={selectedNode.data?.type || 'keyword'} 
                    onChange={e => updateSelectedNodeData({ type: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                  >
                    <option value="keyword">Comment/DM Keyword</option>
                    <option value="story_mention">Story Mention 📸</option>
                  </select>
                </div>
                {(selectedNode.data?.type === 'keyword' || !selectedNode.data?.type) && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Keyword Value</label>
                      <input 
                        type="text" 
                        value={selectedNode.data?.value || ''} 
                        onChange={e => updateSelectedNodeData({ value: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                        placeholder="e.g. claude"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Post ID Constraint (Optional)</label>
                      <input 
                        type="text" 
                        value={selectedNode.data?.post_id || ''} 
                        onChange={e => updateSelectedNodeData({ post_id: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                        placeholder="Post/Reel ID"
                      />
                    </div>
                  </>
                )}
                {selectedNode.data?.type === 'story_mention' && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                    ℹ️ Triggers automatically when a contact mentions your business in their Instagram Story!
                  </div>
                )}
              </>
            )}

            {/* MESSAGE TYPE EDITOR */}
            {selectedNode.type === 'message' && (
              <>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Platform</label>
                  <select 
                    value={selectedNode.data?.platform || 'instagram'} 
                    onChange={e => updateSelectedNodeData({ platform: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                  >
                    <option value="instagram">Instagram DM</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="facebook">Facebook Messenger</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Message Body</label>
                  <textarea 
                    rows={4}
                    value={selectedNode.data?.text || ''} 
                    onChange={e => updateSelectedNodeData({ text: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px', fontFamily: 'inherit' }}
                    placeholder="Type the response body here..."
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Template Type</label>
                  <select 
                    value={selectedNode.data?.template_type || 'text'} 
                    onChange={e => updateSelectedNodeData({ template_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                  >
                    <option value="text">Plain Text</option>
                    <option value="generic">Generic Card Template (Title, Subtitle, Image)</option>
                  </select>
                </div>

                {selectedNode.data?.template_type === 'generic' && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Card Subtitle</label>
                      <input 
                        type="text" 
                        value={selectedNode.data?.subtitle || ''} 
                        onChange={e => updateSelectedNodeData({ subtitle: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                        placeholder="e.g. Please follow to continue"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Image URL</label>
                      <input 
                        type="text" 
                        value={selectedNode.data?.image_url || ''} 
                        onChange={e => updateSelectedNodeData({ image_url: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Expect Input Capture</label>
                  <select 
                    value={selectedNode.data?.expect_input || ''} 
                    onChange={e => updateSelectedNodeData({ expect_input: e.target.value || null })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                  >
                    <option value="">None (Standard Message)</option>
                    <option value="phone">Phone Number (Capture & Send WhatsApp Confirmation)</option>
                  </select>
                </div>

                {/* Quick Replies Editor */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Quick Replies</label>
                    <button 
                      onClick={() => {
                        const qrs = selectedNode.data?.quick_replies || [];
                        updateSelectedNodeData({ quick_replies: [...qrs, { title: 'New reply button' }] });
                      }}
                      style={{ padding: '2px 6px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                    >
                      + Add
                    </button>
                  </div>
                  {selectedNode.data?.quick_replies?.map((qr, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      <input 
                        type="text" 
                        value={qr.title}
                        onChange={e => {
                          const qrs = [...(selectedNode.data?.quick_replies || [])];
                          qrs[idx] = { ...qrs[idx], title: e.target.value };
                          updateSelectedNodeData({ quick_replies: qrs });
                        }}
                        style={{ flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                      />
                      <button 
                        onClick={() => {
                          const qrs = (selectedNode.data?.quick_replies || []).filter((_, i) => i !== idx);
                          updateSelectedNodeData({ quick_replies: qrs });
                        }}
                        style={{ padding: '4px 8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Templates/Postback Buttons Editor */}
                {selectedNode.data?.template_type === 'generic' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Card Buttons</label>
                      <button 
                        onClick={() => {
                          const btns = selectedNode.data?.buttons || [];
                          updateSelectedNodeData({ buttons: [...btns, { title: 'Button Name', type: 'postback' }] });
                        }}
                        style={{ padding: '2px 6px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                      >
                        + Add
                      </button>
                    </div>
                    {selectedNode.data?.buttons?.map((btn, idx) => (
                      <div key={idx} style={{ padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input 
                            type="text" 
                            value={btn.title}
                            placeholder="Button Label"
                            onChange={e => {
                              const btns = [...(selectedNode.data?.buttons || [])];
                              btns[idx] = { ...btns[idx], title: e.target.value };
                              updateSelectedNodeData({ buttons: btns });
                            }}
                            style={{ flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                          />
                          <button 
                            onClick={() => {
                              const btns = (selectedNode.data?.buttons || []).filter((_, i) => i !== idx);
                              updateSelectedNodeData({ buttons: btns });
                            }}
                            style={{ padding: '4px 8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ×
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                          <select 
                            value={btn.type}
                            onChange={e => {
                              const btns = [...(selectedNode.data?.buttons || [])];
                              btns[idx] = { ...btns[idx], type: e.target.value };
                              updateSelectedNodeData({ buttons: btns });
                            }}
                            style={{ flex: 1, padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px' }}
                          >
                            <option value="postback">Postback click</option>
                            <option value="web_url">External Web URL</option>
                          </select>
                          
                          {btn.type === 'web_url' && (
                            <input 
                              type="text" 
                              value={btn.url || ''}
                              placeholder="https://..."
                              onChange={e => {
                                const btns = [...(selectedNode.data?.buttons || [])];
                                btns[idx] = { ...btns[idx], url: e.target.value };
                                updateSelectedNodeData({ buttons: btns });
                              }}
                              style={{ flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px' }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ACTION TYPE EDITOR */}
            {selectedNode.type === 'action' && (
              <>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Action Type</label>
                  <select 
                    value={selectedNode.data?.action_type || 'add_tag'} 
                    onChange={e => updateSelectedNodeData({ action_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                  >
                    <option value="add_tag">Add Tag to Contact</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Tag Value</label>
                  <input 
                    type="text" 
                    value={selectedNode.data?.tag || ''} 
                    onChange={e => updateSelectedNodeData({ tag: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}
                    placeholder="e.g. Lead, Interested, Warm"
                  />
                </div>
              </>
            )}

          </div>
        )}
      </div>

    </div>
  );
}

export default FlowBuilderCanvas;
