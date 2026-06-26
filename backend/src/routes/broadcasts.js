const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { flexAuth } = require('../middleware/auth');
const { sendWhatsAppMessage, sendInstagramMessage, sendFacebookMessage } = require('../services/messagingService');
router.use(flexAuth);

router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM broadcasts WHERE client_id=? ORDER BY created_at DESC', [req.query.client_id]);
  res.json({ success: true, data: rows });
});

router.post('/', async (req, res) => {
  try {
    const { client_id, name, platform, segment, message, scheduled_at } = req.body;
    const id = uuidv4();
    const status = scheduled_at ? 'scheduled' : 'sending';

    // Count recipients
    let countQuery = 'SELECT COUNT(*) as cnt FROM contacts WHERE client_id=?';
    const params = [client_id];
    if (segment && segment !== 'all') {
      const tag = segment.replace('tag:', '');
      countQuery += ' AND JSON_CONTAINS(tags, ?)';
      params.push(JSON.stringify(tag));
    }
    const [[{ cnt }]] = await db.query(countQuery, params);

    await db.query(
      'INSERT INTO broadcasts (id, client_id, name, platform, segment, message, status, scheduled_at, total_recipients) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, client_id, name || 'Broadcast', platform, segment || 'all', message, status, scheduled_at || null, cnt]
    );

    if (!scheduled_at) {
      // Send immediately (async)
      sendBroadcastNow(id, client_id, platform, segment, message, cnt);
    }

    res.status(201).json({ success: true, broadcast_id: id, total_recipients: cnt, status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function sendBroadcastNow(broadcastId, clientId, platform, segment, message, total) {
  try {
    const [clients] = await db.query('SELECT * FROM clients WHERE id=?', [clientId]);
    if (!clients.length) return;
    const client = clients[0];

    let query = 'SELECT * FROM contacts WHERE client_id=? AND platform=?';
    const params = [clientId, platform];
    if (segment && segment !== 'all') {
      const tag = segment.replace('tag:', '');
      query += ' AND JSON_CONTAINS(tags, ?)';
      params.push(JSON.stringify(tag));
    }
    const [contacts] = await db.query(query, params);

    let sentCount = 0;
    for (const contact of contacts) {
      try {
        if (platform === 'whatsapp') {
          let payload = message;
          if (typeof message === 'string' && message.trim().startsWith('{')) {
            try {
              let payloadStr = message.replace(/{{name}}/g, contact.name || 'Friend');
              payload = JSON.parse(payloadStr);
            } catch (e) {
              payload = message;
            }
          }
          await sendWhatsAppMessage(client.wa_phone_number_id, client.wa_access_token, contact.phone, payload);
        }
        else if (platform === 'instagram') await sendInstagramMessage(client.ig_page_token, contact.platform_id, message);
        else if (platform === 'facebook') await sendFacebookMessage(client.fb_page_token, contact.platform_id, message);
        sentCount++;
        await new Promise(r => setTimeout(r, 100)); // throttle
      } catch (e) {}
    }

    await db.query('UPDATE broadcasts SET status=?, sent_count=?, sent_at=NOW() WHERE id=?', ['sent', sentCount, broadcastId]);
  } catch (err) {
    await db.query("UPDATE broadcasts SET status='failed' WHERE id=?", [broadcastId]);
  }
}

module.exports = router;
