const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { sendInstagramMessage, sendWhatsAppMessage, sendFacebookMessage } = require('./messagingService');

// Helper to get next node ID using edges
function getNextNodeId(steps, currentNodeId, handle = null) {
  if (!steps || !steps.edges) return null;
  
  const edges = steps.edges;
  if (handle) {
    // Look for exact handle match first
    const match = edges.find(e => e.source === currentNodeId && e.sourceHandle === handle);
    if (match) return match.target;
  }
  
  // Fallback to any edge starting from currentNodeId
  const fallback = edges.find(e => e.source === currentNodeId);
  return fallback ? fallback.target : null;
}

// Helper to check if a string is a phone number
function extractPhone(text) {
  if (!text) return null;
  const cleaned = text.replace(/\D/g, "");
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return null;
}

// Execute a specific node in a flow
async function executeNode({ client, contact, flow, nodeId, io, skipApi = false, commentId = null }) {
  try {
    let steps = flow.steps;
    if (typeof steps === 'string') {
      steps = JSON.parse(steps);
    }
    
    if (!steps || !steps.nodes) {
      console.log("⚠️ Flow steps or nodes not found in flow:", flow.id);
      return;
    }
    
    const node = steps.nodes.find(n => n.id === nodeId);
    if (!node) {
      console.log("⚠️ Node not found in flow steps:", nodeId);
      return;
    }
    
    console.log(`🚀 Executing Node [${nodeId}] of type [${node.type}] for contact [${contact.id}]`);
    
    const platform = node.data?.platform || flow.platform || 'instagram';
    
    if (node.type === 'message') {
      const text = node.data?.text || node.data?.content || '';
      const quickReplies = node.data?.quick_replies || [];
      const buttons = node.data?.buttons || [];
      const templateType = node.data?.template_type; // 'generic' or 'button' or 'text'
      const imageUrl = node.data?.image_url;
      const subtitle = node.data?.subtitle;
      
      const expectInput = node.data?.expect_input || null;
      await db.execute(
        "UPDATE contacts SET current_flow_id = ?, current_node_id = ?, expect_input = ? WHERE id = ?",
        [flow.id, nodeId, expectInput, contact.id]
      );
      
      let payload = null;
      
      if (platform === 'instagram' || platform === 'facebook') {
        const pageToken = platform === 'instagram' ? client.ig_page_token : client.fb_page_token;
        
        if (templateType === 'generic') {
          payload = {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: [
                  {
                    title: text || "Details",
                    subtitle: subtitle || "",
                    image_url: imageUrl || "",
                    buttons: buttons.map((btn, idx) => {
                      if (btn.type === 'web_url') {
                        return {
                          type: "web_url",
                          url: btn.url,
                          title: btn.title
                        };
                      } else {
                        const targetNodeId = getNextNodeId(steps, nodeId, `btn_${idx}`);
                        return {
                          type: "postback",
                          title: btn.title,
                          payload: `FLOW_NODE:${flow.id}:${targetNodeId || btn.next_node || ''}`
                        };
                      }
                    })
                  }
                ]
              }
            }
          };
        } else if (quickReplies.length > 0) {
          payload = {
            text: text,
            quick_replies: quickReplies.map((qr, idx) => {
              const targetNodeId = getNextNodeId(steps, nodeId, `qr_${idx}`);
              return {
                content_type: "text",
                title: qr.title,
                payload: `FLOW_NODE:${flow.id}:${targetNodeId || qr.next_node || ''}`
              };
            })
          };
        } else {
          payload = text;
        }
        
        console.log(`Sending Instagram/FB DM to ${contact.phone || contact.platform_id} on ${platform}...`);
        
        let sendResult = { success: false };
        const isDemoToken = !pageToken || pageToken.startsWith("demo_") || pageToken.includes("placeholder");
        
        if (!skipApi && !isDemoToken) {
          if (platform === 'instagram') {
            sendResult = await sendInstagramMessage(pageToken, commentId ? { comment_id: commentId } : contact.phone, payload);
          } else {
            sendResult = await sendFacebookMessage(pageToken, contact.phone, payload);
          }
        }
        
        if (!sendResult.success) {
          console.log(`⚠️ Meta API send failed/skipped for contact ${contact.id}. Simulating message in DB.`);
        }
        
        const displayContent = typeof payload === 'object' ? JSON.stringify(payload) : payload;
        await db.execute(
          `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
           VALUES (UUID(), ?, ?, 'outbound', ?, ?)`,
          [client.id, contact.id, platform, displayContent]
        );
        
        if (io) {
          io.to(`client_${client.id}`).emit('new_message', {
            contact_id: contact.id,
            contact_name: contact.name || 'Instagram User',
            message: displayContent
          });
        }
      } else if (platform === 'whatsapp') {
        const waToken = client.wa_access_token;
        const waPhoneId = client.wa_phone_number_id;
        const waTo = contact.phone || contact.platform_id;
        
        let payload = null;
        if (buttons.length > 0) {
          const hasWebUrl = buttons.some(btn => btn.type === 'web_url');
          if (!hasWebUrl && buttons.length <= 3) {
            payload = {
              type: "interactive",
              interactive: {
                type: "button",
                body: { text: text || "Select an option:" },
                action: {
                  buttons: buttons.map((btn, idx) => {
                    const targetNodeId = getNextNodeId(steps, nodeId, `btn_${idx}`);
                    return {
                      type: "reply",
                      reply: {
                        id: `FLOW_NODE:${flow.id}:${targetNodeId || btn.next_node || ''}`,
                        title: btn.title.substring(0, 20)
                      }
                    };
                  })
                }
              }
            };
          } else {
            payload = {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: [
                    {
                      title: text || "Access Links",
                      subtitle: subtitle || "",
                      buttons: buttons.map((btn, idx) => {
                        if (btn.type === 'web_url') {
                          return {
                            type: "web_url",
                            url: btn.url,
                            title: btn.title
                          };
                        } else {
                          const targetNodeId = getNextNodeId(steps, nodeId, `btn_${idx}`);
                          return {
                            type: "postback",
                            title: btn.title,
                            payload: `FLOW_NODE:${flow.id}:${targetNodeId || btn.next_node || ''}`
                          };
                        }
                      })
                    }
                  ]
                }
              }
            };
          }
        } else if (quickReplies.length > 0) {
          payload = {
            type: "interactive",
            interactive: {
              type: "button",
              body: { text: text },
              action: {
                buttons: quickReplies.slice(0, 3).map((qr, idx) => {
                  const targetNodeId = getNextNodeId(steps, nodeId, `qr_${idx}`);
                  return {
                    type: "reply",
                    reply: {
                      id: `FLOW_NODE:${flow.id}:${targetNodeId || qr.next_node || ''}`,
                      title: qr.title.substring(0, 20)
                    }
                  };
                })
              }
            }
          };
        } else {
          payload = text;
        }
        
        console.log(`Sending WhatsApp message to ${waTo}...`);
        let sendResult = { success: false };
        const isDemoToken = !waToken || waToken.startsWith("demo_") || waToken.includes("placeholder");
        
        if (!skipApi && !isDemoToken) {
          const hasWebUrl = buttons.some(btn => btn.type === 'web_url');
          if (buttons.length > 0 && (hasWebUrl || buttons.length > 3)) {
            let waText = text;
            buttons.forEach(btn => {
              if (btn.type === 'web_url') {
                waText += `\n\n👉 ${btn.title}: ${btn.url}`;
              } else {
                waText += `\n\n🔹 ${btn.title}`;
              }
            });
            sendResult = await sendWhatsAppMessage(waPhoneId, waToken, waTo, waText);
          } else {
            sendResult = await sendWhatsAppMessage(waPhoneId, waToken, waTo, payload);
          }
        }
        
        if (!sendResult.success) {
          console.log(`⚠️ WhatsApp API send failed/skipped. Simulating WhatsApp message.`);
        }
        
        const displayContent = typeof payload === 'object' ? JSON.stringify(payload) : payload;
        await db.execute(
          `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
           VALUES (UUID(), ?, ?, 'outbound', 'whatsapp', ?)`,
          [client.id, contact.id, displayContent]
        );
        
        if (io) {
          io.to(`client_${client.id}`).emit('new_message', {
            contact_id: contact.id,
            contact_name: contact.name || 'WhatsApp Contact',
            message: displayContent
          });
        }
      }
      
      if (!expectInput && quickReplies.length === 0 && buttons.length === 0) {
        const nextNodeId = getNextNodeId(steps, nodeId);
        if (nextNodeId) {
          console.log(`➡️ Auto-advancing to next node: ${nextNodeId}`);
          await executeNode({ client, contact, flow, nodeId: nextNodeId, io, skipApi });
        } else {
          await db.execute(
            "UPDATE contacts SET current_flow_id = NULL, current_node_id = NULL, expect_input = NULL WHERE id = ?",
            [contact.id]
          );
        }
      }
    } else if (node.type === 'action') {
      const actionType = node.data?.action_type;
      
      if (actionType === 'add_tag') {
        const tag = node.data?.tag;
        if (tag) {
          let [cRows] = await db.query("SELECT tags FROM contacts WHERE id = ?", [contact.id]);
          let tags = [];
          if (cRows[0] && cRows[0].tags) {
            tags = typeof cRows[0].tags === 'string' ? JSON.parse(cRows[0].tags) : cRows[0].tags;
          }
          if (!tags.includes(tag)) {
            tags.push(tag);
            await db.execute("UPDATE contacts SET tags = ? WHERE id = ?", [JSON.stringify(tags), contact.id]);
          }
        }
      }
      
      const nextNodeId = getNextNodeId(steps, nodeId);
      if (nextNodeId) {
        await executeNode({ client, contact, flow, nodeId: nextNodeId, io, skipApi });
      } else {
        await db.execute(
          "UPDATE contacts SET current_flow_id = NULL, current_node_id = NULL, expect_input = NULL WHERE id = ?",
          [contact.id]
        );
      }
    }
  } catch (err) {
    console.error("❌ Error executing flow node:", err);
  }
}

// Trigger flow by keyword match or other events
async function triggerFlow({ clientId, contactId, platform, triggerType, triggerValue, io, skipApi = false, postId = null, commentId = null }) {
  try {
    const [flows] = await db.query(
      "SELECT * FROM flows WHERE client_id = ? AND platform = ? AND trigger_type = ? AND is_active = 1",
      [clientId, platform, triggerType]
    );
    
    let matchedFlow = null;
    for (const f of flows) {
      let steps = f.steps;
      if (typeof steps === 'string') {
        try {
          steps = JSON.parse(steps);
        } catch (e) {
          continue;
        }
      }
      
      // Check for trigger post_id constraint
      const triggerNode = steps?.nodes?.find(n => n.type === 'trigger');
      if (triggerNode && triggerNode.data?.post_id && postId) {
        if (triggerNode.data.post_id !== postId) {
          continue; // Post constraint mismatch
        }
      }

      if (triggerType === 'keyword') {
        const val = f.trigger_value?.toLowerCase().trim();
        const inputVal = triggerValue?.toLowerCase().trim();
        if (val === inputVal || (inputVal.startsWith('#') && inputVal.substring(1) === val)) {
          matchedFlow = f;
          break;
        }
      } else {
        matchedFlow = f;
        break;
      }
    }
    
    if (!matchedFlow) {
      return false;
    }
    
    console.log(`🎯 Matched flow: [${matchedFlow.name}] (${matchedFlow.id})`);
    
    await db.execute("UPDATE flows SET total_triggered = total_triggered + 1 WHERE id = ?", [matchedFlow.id]);
    
    const [clientRows] = await db.query("SELECT * FROM clients WHERE id = ?", [clientId]);
    const [contactRows] = await db.query("SELECT * FROM contacts WHERE id = ?", [contactId]);
    
    const client = clientRows[0];
    const contact = contactRows[0];
    
    if (!client || !contact) return false;
    
    let steps = matchedFlow.steps;
    if (typeof steps === 'string') {
      steps = JSON.parse(steps);
    }
    
    if (!steps || !steps.nodes) return false;
    
    let startNodeId = null;
    const triggerNode = steps.nodes.find(n => n.type === 'trigger');
    if (triggerNode) {
      startNodeId = getNextNodeId(steps, triggerNode.id);
    }
    
    if (!startNodeId) {
      const messageNode = steps.nodes.find(n => n.type === 'message');
      if (messageNode) startNodeId = messageNode.id;
    }
    
    if (startNodeId) {
      await executeNode({ client, contact, flow: matchedFlow, nodeId: startNodeId, io, skipApi, commentId });
      return true;
    }
    
    return false;
  } catch (err) {
    console.error("❌ Error in triggerFlow:", err);
    return false;
  }
}

// Handle quick reply / button postback
async function handlePostback({ clientId, contactId, platform, payload, io, skipApi = false }) {
  try {
    if (!payload || !payload.startsWith("FLOW_NODE:")) return false;
    
    const parts = payload.split(":");
    const flowId = parts[1];
    const nodeId = parts[2];
    
    if (!flowId || !nodeId) return false;
    
    const [flows] = await db.query("SELECT * FROM flows WHERE id = ?", [flowId]);
    if (!flows.length) return false;
    const flow = flows[0];
    
    const [clientRows] = await db.query("SELECT * FROM clients WHERE id = ?", [clientId]);
    const [contactRows] = await db.query("SELECT * FROM contacts WHERE id = ?", [contactId]);
    
    const client = clientRows[0];
    const contact = contactRows[0];
    
    if (!client || !contact) return false;
    
    await executeNode({ client, contact, flow, nodeId, io, skipApi });
    return true;
  } catch (err) {
    console.error("❌ Error in handlePostback:", err);
    return false;
  }
}

// Check if user text matches any quick reply button of their current node and advance flow
async function handleTextQuickReply({ clientId, contactId, text, io, skipApi = false }) {
  try {
    const [contacts] = await db.query("SELECT * FROM contacts WHERE id = ?", [contactId]);
    if (!contacts.length) return false;
    const contact = contacts[0];
    
    if (!contact.current_flow_id || !contact.current_node_id) {
      return false;
    }
    
    const flowId = contact.current_flow_id;
    const nodeId = contact.current_node_id;
    
    const [flows] = await db.query("SELECT * FROM flows WHERE id = ?", [flowId]);
    if (!flows.length) return false;
    const flow = flows[0];
    
    let steps = flow.steps;
    if (typeof steps === 'string') {
      steps = JSON.parse(steps);
    }
    if (!steps || !steps.nodes) return false;
    
    const node = steps.nodes.find(n => n.id === nodeId);
    if (!node) return false;
    
    const quickReplies = node.data?.quick_replies || [];
    const buttons = node.data?.buttons || [];
    
    const cleanInput = text.toLowerCase().trim();
    
    // 1. Check quick replies first
    let matchedQrIdx = quickReplies.findIndex(qr => qr.title?.toLowerCase().trim() === cleanInput);
    if (matchedQrIdx !== -1) {
      const targetNodeId = getNextNodeId(steps, nodeId, `qr_${matchedQrIdx}`);
      if (targetNodeId) {
        console.log(`🎯 Matched Quick Reply text: [${quickReplies[matchedQrIdx].title}] -> Node: ${targetNodeId}`);
        const [clientRows] = await db.query("SELECT * FROM clients WHERE id = ?", [clientId]);
        const client = clientRows[0];
        if (client) {
          await executeNode({ client, contact, flow, nodeId: targetNodeId, io, skipApi });
          return true;
        }
      }
    }
    
    // 2. Check reply buttons
    let matchedBtnIdx = buttons.findIndex(btn => btn.title?.toLowerCase().trim() === cleanInput && btn.type !== 'web_url');
    if (matchedBtnIdx !== -1) {
      const targetNodeId = getNextNodeId(steps, nodeId, `btn_${matchedBtnIdx}`);
      if (targetNodeId) {
        console.log(`🎯 Matched Button text: [${buttons[matchedBtnIdx].title}] -> Node: ${targetNodeId}`);
        const [clientRows] = await db.query("SELECT * FROM clients WHERE id = ?", [clientId]);
        const client = clientRows[0];
        if (client) {
          await executeNode({ client, contact, flow, nodeId: targetNodeId, io, skipApi });
          return true;
        }
      }
    }
    
    return false;
  } catch (err) {
    console.error("❌ Error in handleTextQuickReply:", err);
    return false;
  }
}

// Handle plain text response (e.g. collecting phone number)
async function handleUserInput({ clientId, contactId, platform, text, io, skipApi = false }) {
  try {
    const [contacts] = await db.query("SELECT * FROM contacts WHERE id = ?", [contactId]);
    if (!contacts.length) return false;
    const contact = contacts[0];
    
    if (!contact.current_flow_id || !contact.current_node_id || !contact.expect_input) {
      return false;
    }
    
    const flowId = contact.current_flow_id;
    const nodeId = contact.current_node_id;
    const expectInput = contact.expect_input;
    
    const [flows] = await db.query("SELECT * FROM flows WHERE id = ?", [flowId]);
    if (!flows.length) return false;
    const flow = flows[0];
    
    const [clientRows] = await db.query("SELECT * FROM clients WHERE id = ?", [clientId]);
    const client = clientRows[0];
    if (!client) return false;
    
    if (expectInput === 'phone') {
      const phone = extractPhone(text);
      if (phone) {
        console.log(`🎯 Captured phone [${phone}] from contact [${contactId}] in flow [${flowId}]`);
        
        await db.execute("UPDATE contacts SET phone = ? WHERE id = ?", [phone, contactId]);
        
        const waPhoneId = client.wa_phone_number_id;
        const waToken = client.wa_access_token;
        const confirmationBody = `Hey 👋 Welcome to ${client.business_name || client.name}.\nWe received your request successfully.\nOur team will contact you shortly.`;
        
        console.log(`Sending WhatsApp confirmation payload to ${phone}...`);
        
        let sendResult = { success: false };
        const isDemoToken = !waToken || waToken.startsWith("demo_") || waToken.includes("placeholder");
        
        if (!skipApi && !isDemoToken) {
          sendResult = await sendWhatsAppMessage(waPhoneId, waToken, phone, confirmationBody);
        }
        
        await db.execute(
          `INSERT INTO messages (id, client_id, contact_id, direction, platform, content)
           VALUES (UUID(), ?, ?, 'outbound', 'whatsapp', ?)`,
          [client.id, contactId, confirmationBody]
        );
        
        if (io) {
          io.to(`client_${client.id}`).emit('new_message', {
            contact_id: contactId,
            contact_name: contact.name || 'WhatsApp Contact',
            message: confirmationBody
          });
        }
        
        let steps = flow.steps;
        if (typeof steps === 'string') {
          steps = JSON.parse(steps);
        }
        
        const nextNodeId = getNextNodeId(steps, nodeId);
        if (nextNodeId) {
          await executeNode({ client, contact: { ...contact, phone }, flow, nodeId: nextNodeId, io, skipApi });
        } else {
          await db.execute(
            "UPDATE contacts SET current_flow_id = NULL, current_node_id = NULL, expect_input = NULL WHERE id = ?",
            [contactId]
          );
        }
        return true;
      } else {
        console.log(`⚠️ Invalid phone number received: ${text}`);
        return false;
      }
    }
    
    return false;
  } catch (err) {
    console.error("❌ Error in handleUserInput:", err);
    return false;
  }
}

module.exports = {
  triggerFlow,
  handlePostback,
  handleUserInput,
  handleTextQuickReply,
  executeNode
};
