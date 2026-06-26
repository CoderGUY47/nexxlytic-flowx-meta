const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { flexAuth } = require('../middleware/auth');
router.use(flexAuth);

router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT p.*, c.name as contact_name FROM payments p LEFT JOIN contacts c ON p.contact_id = c.id WHERE p.client_id=? ORDER BY p.created_at DESC', [req.query.client_id]);
  res.json({ success: true, data: rows });
});

router.post('/', async (req, res) => {
  try {
    const { client_id, contact_id, amount, currency, description, payment_gateway } = req.body;
    const id = uuidv4();
    await db.query(
      'INSERT INTO payments (id, client_id, contact_id, amount, currency, description, payment_gateway) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, client_id, contact_id, amount, currency || 'INR', description, payment_gateway || 'manual']
    );
    res.status(201).json({ success: true, payment_id: id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status, gateway_payment_id } = req.body;
    await db.query('UPDATE payments SET status=?, gateway_payment_id=? WHERE id=?', [status, gateway_payment_id, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Razorpay webhook
router.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body);
    if (event.event === 'payment.captured') {
      const paymentId = event.payload.payment.entity.id;
      await db.query("UPDATE payments SET status='paid', gateway_payment_id=? WHERE gateway_payment_id=?", [paymentId, paymentId]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
