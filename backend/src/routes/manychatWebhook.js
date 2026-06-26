const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/send-whatsapp', async (req, res) => {
  try {
    // ManyChat will send these
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'phone is required' });
    }

    console.log('📞 Received number:', phone);

    // Send WhatsApp message via Cloud API
    const resp = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone, // e.g., 9198XXXXXXXX
        type: "text",
        text: { body: "Thanks! We received your request 🎉" }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WA sent:', resp.data);
    return res.json({ success: true });

  } catch (err) {
    console.error('❌ WA error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

module.exports = router;