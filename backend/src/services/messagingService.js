const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const logger = require('../config/logger');

// Send WhatsApp message via Meta Cloud API (supporting rich template/interactive payloads)
const sendWhatsAppMessage = async (phoneNumberId, accessToken, to, messagePayload) => {
  try {
    let payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, '')
    };

    if (typeof messagePayload === 'object') {
      payload = { ...payload, ...messagePayload };
    } else {
      payload = { ...payload, type: 'text', text: { preview_url: false, body: messagePayload } };
    }

    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, wa_message_id: res.data.messages?.[0]?.id };
  } catch (err) {
    logger.error('WhatsApp send error:', err.response?.data || err.message);
    return { success: false, error: err.response?.data };
  }
};

// Send Instagram DM (supporting rich templates/carousels/quick replies)
const sendInstagramMessage = async (pageToken, recipientId, messagePayload) => {
  try {
    const message = typeof messagePayload === 'object' ? messagePayload : { text: messagePayload };
    const res = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message
      },
      { params: { access_token: pageToken } }
    );
    return { success: true, message_id: res.data.message_id };
  } catch (err) {
    logger.error('Instagram send error:', err.response?.data || err.message);
    return { success: false, error: err.response?.data };
  }
};

// Send Facebook Messenger message
const sendFacebookMessage = async (pageToken, recipientId, message) => {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message }
      },
      { params: { access_token: pageToken } }
    );
    return { success: true, message_id: res.data.message_id };
  } catch (err) {
    logger.error('Facebook send error:', err.response?.data || err.message);
    return { success: false, error: err.response?.data };
  }
};

// Main send message controller
const sendMessage = async (req, res) => {
  try {
    const { client_id, contact_id, to, platform, message, message_type = 'text' } = req.body;

    const [clients] = await db.query('SELECT * FROM clients WHERE id = ?', [client_id]);
    if (!clients.length) return res.status(404).json({ error: 'Client not found' });
    const client = clients[0];

    let result;
    if (platform === 'whatsapp') {
      result = await sendWhatsAppMessage(client.wa_phone_number_id, client.wa_access_token, to, message);
    } else if (platform === 'instagram') {
      result = await sendInstagramMessage(client.ig_page_token, to, message);
    } else if (platform === 'facebook') {
      result = await sendFacebookMessage(client.fb_page_token, to, message);
    } else {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Save to DB
    const msgId = uuidv4();
    await db.query(
      'INSERT INTO messages (id, client_id, contact_id, direction, platform, message_type, content, status, wa_message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [msgId, client_id, contact_id || null, 'outbound', platform, message_type, message, result.success ? 'sent' : 'failed', result.wa_message_id || null]
    );

    // Update contact last_message_at
    if (contact_id) {
      await db.query('UPDATE contacts SET last_message_at = NOW() WHERE id = ?', [contact_id]);
    }

    // Emit real-time event
    const io = req.app.get('io');
    io?.to(`client_${client_id}`).emit('message_sent', { message_id: msgId, platform, to, content: message });

    res.json({ success: result.success, message_id: msgId, platform_response: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { client_id, contact_id, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM messages WHERE client_id = ?';
    const params = [client_id];

    if (contact_id) { query += ' AND contact_id = ?'; params.push(contact_id); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { sendMessage, getMessages, sendWhatsAppMessage, sendInstagramMessage, sendFacebookMessage };
