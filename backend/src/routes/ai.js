const axios = require('axios');
const express = require('express');
const router = express.Router();
const { flexAuth } = require('../middleware/auth');

// Helper to dynamically configure OpenAI vs OpenRouter
const getAIConfig = (apiKey) => {
  const key = apiKey || process.env.OPENAI_API_KEY || '';
  if (key.startsWith('sk-or')) {
    return {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'openrouter/auto',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Nexxlytic FlowX'
      }
    };
  } else {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    };
  }
};

// AI reply generation
const generateReply = async (message, context = '', language = 'hinglish') => {
  const langInstr = language === 'urdu' ? 'Reply in Roman Urdu only.' :
    language === 'english' ? 'Reply in English only.' :
    'Reply in Hinglish (mix of Hindi/Urdu words with English naturally).';

  const prompt = `You are a professional business chatbot assistant for ${context || 'a business'}.
A customer sent this message: "${message}"
${langInstr}
Keep reply warm, professional, and under 40 words.
Do NOT use emojis. Do NOT use asterisks for formatting.`;

  const config = getAIConfig(process.env.OPENAI_API_KEY);

  const res = await axios.post(
    config.url,
    {
      model: config.model,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    },
    { headers: config.headers }
  );

  return res.data.choices[0]?.message?.content || '';
};

// Generate caption
const generateCaption = async (topic, platform, tone, language) => {
  const prompt = `You are a social media expert for a Pakistani/Indian agency.
Generate a ${tone} caption for ${platform} about: "${topic}".
Language: ${language}.
Include relevant hashtags. Make it engaging and conversion-focused.
Under 150 words.`;

  const config = getAIConfig(process.env.OPENAI_API_KEY);

  const res = await axios.post(
    config.url,
    {
      model: config.model,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    },
    { headers: config.headers }
  );

  return res.data.choices[0]?.message?.content || '';
};

// Routes
router.post('/reply', flexAuth, async (req, res) => {
  try {
    const { message, context, language } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const reply = await generateReply(message, context, language);
    res.json({ success: true, reply, language: language || 'hinglish' });
  } catch (err) {
    console.error("❌ AI Route Error details:", err.response?.data || err.message);
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

router.post('/caption', flexAuth, async (req, res) => {
  try {
    const { topic, platform, tone, language } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic required' });

    const caption = await generateCaption(topic, platform || 'Instagram', tone || 'professional', language || 'Hinglish');
    res.json({ success: true, caption });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/broadcast-message', flexAuth, async (req, res) => {
  try {
    const { topic, context, language } = req.body;
    const prompt = `Write a broadcast message for: "${topic}". Business: ${context || 'general business'}. Language: ${language || 'Hinglish'}. Engaging, under 80 words, no hashtags.`;

    const config = getAIConfig(process.env.OPENAI_API_KEY);
    const r = await axios.post(
      config.url,
      { model: config.model, max_tokens: 250, messages: [{ role: 'user', content: prompt }] },
      { headers: config.headers }
    );

    res.json({ success: true, message: r.data.choices[0]?.message?.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.generateReply = generateReply;
