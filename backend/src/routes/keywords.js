// keywords.js
const express = require('express');
const kwRouter = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { flexAuth } = require('../middleware/auth');
kwRouter.use(flexAuth);

kwRouter.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM keywords WHERE client_id=? ORDER BY created_at DESC', [req.query.client_id]);
  res.json({ success: true, data: rows });
});
kwRouter.post('/', async (req, res) => {
  try {
    const { client_id, keyword, platform, reply_text, match_type, post_id } = req.body;
    if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

    let cleanKw = keyword.trim();
    if (cleanKw.startsWith('./')) cleanKw = cleanKw.slice(2);
    if (cleanKw.startsWith('/')) cleanKw = cleanKw.slice(1);
    if (cleanKw.endsWith('/')) cleanKw = cleanKw.slice(0, -1);

    const kwList = cleanKw.includes('/')
      ? cleanKw.split('/').map(k => k.trim()).filter(Boolean)
      : [cleanKw];

    const insertedIds = [];
    for (const kw of kwList) {
      const id = uuidv4();
      await db.query(
        'INSERT INTO keywords (id, client_id, keyword, platform, reply_text, match_type, post_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, client_id, kw, platform || 'all', reply_text, match_type || 'contains', post_id || null]
      );
      insertedIds.push(id);
    }
    res.status(201).json({ success: true, keyword_ids: insertedIds, count: insertedIds.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
kwRouter.put('/:id', async (req, res) => {
  const { keyword, reply_text, is_active } = req.body;
  await db.query('UPDATE keywords SET keyword=?, reply_text=?, is_active=? WHERE id=?', [keyword, reply_text, is_active, req.params.id]);
  res.json({ success: true });
});
kwRouter.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM keywords WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

kwRouter.post('/clone', async (req, res) => {
  try {
    const { from_client_id, to_client_id } = req.body;
    if (!from_client_id || !to_client_id) return res.status(400).json({ error: 'from_client_id and to_client_id required' });
    const [rows] = await db.query('SELECT * FROM keywords WHERE client_id=?', [from_client_id]);
    if (!rows.length) return res.status(404).json({ error: 'No keywords found in source client' });
    
    // Get existing keywords of target client to prevent duplicate cloning
    const [existingKws] = await db.query('SELECT keyword FROM keywords WHERE client_id = ?', [to_client_id]);
    const existingSet = new Set(existingKws.map(ek => ek.keyword.toLowerCase().trim()));

    const clonedIds = [];
    let clonedCount = 0;
    for (const kw of rows) {
      const normalized = kw.keyword.toLowerCase().trim();
      if (existingSet.has(normalized)) {
        continue; // Skip if keyword already exists in target client
      }
      const newId = uuidv4();
      await db.query(
        'INSERT INTO keywords (id, client_id, keyword, platform, reply_text, match_type) VALUES (?, ?, ?, ?, ?, ?)',
        [newId, to_client_id, kw.keyword, kw.platform, kw.reply_text, kw.match_type]
      );
      clonedIds.push(newId);
      clonedCount++;
    }
    res.json({ success: true, cloned: clonedCount, cloned_ids: clonedIds });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

kwRouter.post('/revert', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids array required' });
    }
    await db.query('DELETE FROM keywords WHERE id IN (?)', [ids]);
    res.json({ success: true, deleted: ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = kwRouter;
