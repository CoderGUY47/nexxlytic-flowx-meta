const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { flexAuth } = require('../middleware/auth');
router.use(flexAuth);

router.get('/', async (req, res) => {
  const { client_id } = req.query;
  const [rows] = await db.query('SELECT * FROM flows WHERE client_id = ? ORDER BY created_at DESC', [client_id]);
  res.json({ success: true, data: rows });
});

router.post('/', async (req, res) => {
  try {
    const { client_id, name, platform, trigger_type, trigger_value, steps } = req.body;
    const id = uuidv4();
    await db.query(
      'INSERT INTO flows (id, client_id, name, platform, trigger_type, trigger_value, steps) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, client_id, name, platform, trigger_type, trigger_value, JSON.stringify(steps)]
    );
    res.status(201).json({ success: true, flow_id: id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, platform, trigger_value, steps, is_active } = req.body;
    await db.query(
      'UPDATE flows SET name=?, platform=?, trigger_value=?, steps=?, is_active=? WHERE id=?',
      [name, platform, trigger_value, JSON.stringify(steps), is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM flows WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

router.post('/trigger', async (req, res) => {
  try {
    const { flow_id, contact_id, variables } = req.body;
    const [flows] = await db.query('SELECT * FROM flows WHERE id=?', [flow_id]);
    if (!flows.length) return res.status(404).json({ error: 'Flow not found' });
    await db.query('UPDATE flows SET total_triggered = total_triggered + 1 WHERE id=?', [flow_id]);
    res.json({ success: true, status: 'triggered', flow_id, contact_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
