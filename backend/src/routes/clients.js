// ============ clients.js ============
const express = require('express');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { flexAuth } = require('../middleware/auth');

const clientRouter = express.Router();
clientRouter.use(flexAuth);

clientRouter.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ success: true, data: rows });
});

clientRouter.post('/', async (req, res) => {
  try {
    const { name, business_name, wa_phone_number_id, wa_access_token, ig_page_token, fb_page_token, fb_page_id } = req.body;
    const id = uuidv4();
    await db.query(
      'INSERT INTO clients (id, user_id, name, business_name, wa_phone_number_id, wa_access_token, ig_page_token, fb_page_token, fb_page_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, name, business_name, wa_phone_number_id, wa_access_token, ig_page_token, fb_page_token, fb_page_id]
    );

    // Auto-create special intro keywords for the new client
    const defaultIntroKeywords = [
      {
        keyword: '/start',
        platform: 'all',
        reply_text: 'Welcome! 👋 Thank you for starting a chat with us. Here are the options you can try:\n\n💬 Reply with */help* for assistance\n📞 Reply with */contact* for support details\n❌ Reply with */end* to close this chat.',
        match_type: 'contains'
      },
      {
        keyword: '/help',
        platform: 'all',
        reply_text: 'Need assistance? 🛠️ Here is what you can do:\n\n1️⃣ Ask about our *pricing*\n2️⃣ Ask about our *services*\n3️⃣ Type */contact* to connect with a support agent.',
        match_type: 'contains'
      },
      {
        keyword: '/contact',
        platform: 'all',
        reply_text: 'Connect with us! 📞 You can reach our support team directly at support@flowx.com or call us at 8801882652756. We are active Mon-Sat, 10 AM to 6 PM.',
        match_type: 'contains'
      },
      {
        keyword: '/end',
        platform: 'all',
        reply_text: 'Chat closed. ❌ Thank you for talking to us! Your session has ended. You can start a new chat anytime by typing */start*.',
        match_type: 'contains'
      },
      {
        keyword: 'hi',
        platform: 'all',
        reply_text: 'Welcome! 👋 Thank you for starting a chat with us. Here are the options you can try:\n\n💬 Reply with */help* for assistance\n📞 Reply with */contact* for support details\n❌ Reply with */end* to close this chat.',
        match_type: 'exact'
      },
      {
        keyword: 'hello',
        platform: 'all',
        reply_text: 'Welcome! 👋 Thank you for starting a chat with us. Here are the options you can try:\n\n💬 Reply with */help* for assistance\n📞 Reply with */contact* for support details\n❌ Reply with */end* to close this chat.',
        match_type: 'exact'
      }
    ];

    for (const kw of defaultIntroKeywords) {
      await db.query(
        'INSERT INTO keywords (id, client_id, keyword, platform, reply_text, match_type) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), id, kw.keyword, kw.platform, kw.reply_text, kw.match_type]
      );
    }

    const [rows] = await db.query('SELECT * FROM clients WHERE id = ?', [id]);
    res.status(201).json({ success: true, client: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

clientRouter.put('/:id', async (req, res) => {
  try {
    const { name, business_name, wa_phone_number_id, wa_access_token, ig_page_token, fb_page_token, fb_page_id } = req.body;
    await db.query(
      'UPDATE clients SET name=?, business_name=?, wa_phone_number_id=?, wa_access_token=?, ig_page_token=?, fb_page_token=?, fb_page_id=? WHERE id=? AND user_id=?',
      [name, business_name, wa_phone_number_id, wa_access_token, ig_page_token, fb_page_token, fb_page_id, req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

clientRouter.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM clients WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

module.exports = clientRouter;
