const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const userId = 'd6dea132-ec25-428e-bdb5-7382550f11f9'; // test@agency.com
const waPhoneId = '1114352238437100';
const waToken = process.env.WA_ACCESS_TOKEN || 'your_whatsapp_access_token_here';

const clientsData = [
  {
    name: 'CloudFlow AI',
    business_name: 'CloudFlow AI SaaS Solutions',
    keyword: 'trial',
    reply_text: 'Thanks for your interest in CloudFlow AI! 🚀 Get your free 14-day trial credentials at: https://cloudflow.ai/signup. Reply with "features" for tool details.',
    flow_name: 'Trial Setup Flow',
    flow_trigger: 'signup, start',
    flow_msg: 'Welcome to CloudFlow AI! ⚙️ Let\'s get your automation workflow set up. Send us your email address, and our support team will provision your sandbox environment!'
  },
  {
    name: 'Vortex VR Studios',
    business_name: 'Vortex VR & Metaverse Agency',
    keyword: 'vr',
    reply_text: 'Welcome to Vortex VR! 🕶️ We design immersive spaces, virtual tours, and custom VR apps. Reply with "demo" to schedule a VR headset trial session.',
    flow_name: 'Metaverse Demo Booking',
    flow_trigger: 'demo, tour, booking',
    flow_msg: 'Hey! 🌌 Vortex VR metaverse demo slots are available this Wednesday. Reply with your preferred timing (Morning or Evening) to book a live virtual walk-through.'
  },
  {
    name: 'CodeCraft Academy',
    business_name: 'CodeCraft Tech Bootcamps',
    keyword: 'course',
    reply_text: 'CodeCraft offers bootcamps in AI engineering, Full-Stack Coding, and DevOps! 💻 Reply with "apply" to start your application or "syllabus" for curriculum.',
    flow_name: 'Bootcamp Application',
    flow_trigger: 'apply, register, admission',
    flow_msg: 'Welcome to CodeCraft Academy! 🎓 Classes start next month. Send us your contact number and background, and an admissions counselor will call you shortly.'
  },
  {
    name: 'Quantum Digital',
    business_name: 'Quantum Digital Growth Agency',
    keyword: 'marketing',
    reply_text: 'Quantum Digital scales B2B tech startups using SEO, Ads, and automated CRM pipelines. 📈 Reply with "services" for our package menu.',
    flow_name: 'Free Strategy Audit',
    flow_trigger: 'audit, quote, pricing',
    flow_msg: 'Hi! 📊 Get a free 15-minute video audit of your current digital marketing strategy. Just reply with your website URL and target monthly budget.'
  },
  {
    name: 'TaskForce Virtual',
    business_name: 'TaskForce Outsourcing & VA',
    keyword: 'hire',
    reply_text: 'TaskForce matches tech founders with vetted virtual assistants starting at $10/hr. 💼 Reply with "rates" for our pricing sheet.',
    flow_name: 'VA Hiring Assistant',
    flow_trigger: 'va, assistant, task',
    flow_msg: 'Need to delegate research, emails, or scheduling? 📑 Reply with the primary tasks you want to outsource, and we will match you with 3 VA resumes today!'
  }
];

async function seed() {
  console.log('🌱 Starting tech client seeder...');
  
  try {
    for (const c of clientsData) {
      const clientId = uuidv4();
      
      // 1. Insert Client
      await pool.query(
        'INSERT INTO clients (id, user_id, name, business_name, wa_phone_number_id, wa_access_token) VALUES (?, ?, ?, ?, ?, ?)',
        [clientId, userId, c.name, c.business_name, waPhoneId, waToken]
      );
      console.log(`✅ Created Client: ${c.name}`);
      
      // 2. Insert Keyword
      const kwId = uuidv4();
      await pool.query(
        'INSERT INTO keywords (id, client_id, keyword, platform, reply_text, match_type, is_active) VALUES (?, ?, ?, "whatsapp", ?, "contains", 1)',
        [kwId, clientId, c.keyword, c.reply_text]
      );
      console.log(`   └─ Created Keyword FAQ: "${c.keyword}"`);
      
      // 3. Insert Flow
      const flowId = uuidv4();
      const steps = [{ type: 'message', content: c.flow_msg }];
      await pool.query(
        'INSERT INTO flows (id, client_id, name, platform, trigger_type, trigger_value, steps, is_active) VALUES (?, ?, ?, "whatsapp", "keyword", ?, ?, 1)',
        [flowId, clientId, c.flow_name, c.flow_trigger, JSON.stringify(steps)]
      );
      console.log(`   └─ Created Automation Flow: "${c.flow_name}" (triggers on: ${c.flow_trigger})`);
    }
    
    console.log('\n🎉 Successfully seeded all 5 tech clients, keywords, and automation flows!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  }
}

seed();
