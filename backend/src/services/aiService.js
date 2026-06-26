const axios = require("axios");

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

async function generateAIReply(userMessage, history = []) {
  try {
    const messages = [
      {
        role: "system",
        content: "You are a smart sales assistant. Keep replies short, friendly, and helpful."
      },
      ...history,
      {
        role: "user",
        content: userMessage
      }
    ];

    const config = getAIConfig(process.env.OPENAI_API_KEY);
    const response = await axios.post(
      config.url,
      {
        model: config.model,
        messages: messages,
        max_tokens: 150
      },
      { headers: config.headers }
    );

    return response.data.choices[0]?.message?.content || "";

  } catch (err) {
    console.log("❌ AI ERROR:", err.response?.data || err.message);
    return "Sorry, something went wrong.";
  }
}

module.exports = { generateAIReply };