const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const flowsData = [
  // ==========================================
  // CLIENT 1: CloudFlow AI (SaaS)
  // ==========================================
  {
    clientName: 'CloudFlow AI',
    flows: [
      {
        name: 'Trial Request Flow',
        trigger: 'trial, free, signup',
        msg: 'Welcome to CloudFlow AI! 🚀 Let\'s get your automation workflow set up. Send us your email address, and our support team will provision your free 14-day sandbox environment!'
      },
      {
        name: 'Feature Tour Flow',
        trigger: 'features, tools, integration',
        msg: 'Our SaaS platform integrates with Slack, Google Drive, and databases natively! ⚙️ Reply with "slack" or "db" to learn more about specific connectors.'
      },
      {
        name: 'Pricing Plans Flow',
        trigger: 'price, cost, plan',
        msg: 'CloudFlow AI plans:\n\n1️⃣ Starter: $49/mo (5 workflows)\n2️⃣ Business: $199/mo (Unlimited workflows + API access)\n\nReply with "upgrade" to choose your plan.'
      },
      {
        name: 'API Documentation Flow',
        trigger: 'api, developer, docs',
        msg: 'Need to build custom integrations? 💻 Our API documentation is available at developer.cloudflow.ai. Type "key" to request a developer sandbox token.'
      }
    ]
  },
  // ==========================================
  // CLIENT 2: Vortex VR Studios (VR/Metaverse)
  // ==========================================
  {
    clientName: 'Vortex VR Studios',
    flows: [
      {
        name: 'Metaverse Tour Flow',
        trigger: 'metaverse, space, tour',
        msg: 'Step into the virtual world! 🌌 Vortex VR metaverse demo slots are available this Wednesday. Reply with your preferred timing (Morning or Evening) to book a live virtual walk-through.'
      },
      {
        name: 'Virtual Reality Hardware Flow',
        trigger: 'device, headset, gear',
        msg: 'We support Meta Quest 3, Apple Vision Pro, and HTC Vive Pro. 🕶️ Need to rent gear? Reply with "rent" for headset rental packages.'
      },
      {
        name: 'Project Showcase Flow',
        trigger: 'portfolio, case, show',
        msg: 'Check out our latest VR architecture & training simulations here: vortexvr.com/portfolio. 🏛️ Reply with "custom" if you want a custom environment quote.'
      },
      {
        name: 'VR Tech Support Flow',
        trigger: 'hardware, sensor, calibrate',
        msg: 'Troubleshooting your headset? 🛠️ Make sure sensors are clean and firmware is updated. Reply with "agent" to speak with a VR technician.'
      }
    ]
  },
  // ==========================================
  // CLIENT 3: CodeCraft Academy (Tech Bootcamp)
  // ==========================================
  {
    clientName: 'CodeCraft Academy',
    flows: [
      {
        name: 'Admissions Flow',
        trigger: 'apply, register, admission',
        msg: 'Welcome to CodeCraft Academy! 🎓 Classes start next month. Send us your contact number and background, and an admissions counselor will call you shortly.'
      },
      {
        name: 'Syllabus Request Flow',
        trigger: 'curriculum, syllabus, subjects',
        msg: 'We offer three core bootcamps:\n\n1️⃣ AI & Machine Learning\n2️⃣ Full-Stack Web Development\n3️⃣ Cyber Security\n\nReply with "syllabus 1", "syllabus 2" or "syllabus 3" to receive the PDF!'
      },
      {
        name: 'Scholarships & Aid Flow',
        trigger: 'scholarship, discount, financial',
        msg: 'We believe education should be accessible! 🎒 We offer up to 40% financial aid for merit-based candidates. Reply with "apply aid" to get the scholarship form.'
      },
      {
        name: 'Job Guarantee Program Flow',
        trigger: 'job, career, placement',
        msg: 'Our bootcamps include a 6-month post-graduation Job Guarantee or your money back! 💼 Reply with "hired" to see our partner companies and student success rates.'
      }
    ]
  },
  // ==========================================
  // CLIENT 4: Quantum Digital (Agency)
  // ==========================================
  {
    clientName: 'Quantum Digital',
    flows: [
      {
        name: 'SEO Strategy Quote Flow',
        trigger: 'seo, audit, ranking',
        msg: 'Hi! 📈 Get a free 15-minute video audit of your website\'s current SEO rankings. Just reply with your website URL and target keywords.'
      },
      {
        name: 'Social Ads Setup Flow',
        trigger: 'ads, facebook, leadgen',
        msg: 'Want high-converting social media ads? 📣 We build target audience segments, creative copy, and lead capture forms. Reply with "schedule" for a free consulting call.'
      },
      {
        name: 'Agency Portfolio Flow',
        trigger: 'clients, success, results',
        msg: 'We have scaled 50+ tech startups past $100K/mo. 🏆 See our case studies at quantumdigital.com/results. Reply with "consult" to book your growth call.'
      },
      {
        name: 'Reporting Dashboard Flow',
        trigger: 'report, analytics, metrics',
        msg: 'Our clients get a real-time growth dashboard tracking leads, CAC, and ROI. 📊 Reply with "demo dashboard" to view a sample client report.'
      }
    ]
  },
  // ==========================================
  // CLIENT 5: TaskForce Virtual (VA Agency)
  // ==========================================
  {
    clientName: 'TaskForce Virtual',
    flows: [
      {
        name: 'VA Matching Request Flow',
        trigger: 'va, assistant, task',
        msg: 'Need to delegate research, emails, or scheduling? 📑 Reply with the primary tasks you want to outsource, and we will match you with 3 VA resumes today!'
      },
      {
        name: 'VA Pricing Rates Flow',
        trigger: 'rates, pricing, hourly',
        msg: 'TaskForce VA hourly rates:\n\n1️⃣ Part-Time: $12/hr (20 hrs/week)\n2️⃣ Full-Time: $10/hr (40 hrs/week)\n\nNo setup fees or long-term lock-ins! Reply with "hire" to start.'
      },
      {
        name: 'Vetted Skills List Flow',
        trigger: 'skills, capability, handle',
        msg: 'Our assistants are trained in:\n\n💬 Customer Support (Zendesk, Intercom)\n📧 Email & Inbox Management\n📅 Calendar Scheduling\n📊 CRM Data Entry\n\nReply with "resume" to see candidate profiles.'
      },
      {
        name: 'Client Testimonials Flow',
        trigger: 'reviews, trust, feedback',
        msg: 'Hear what other tech founders say about TaskForce Virtual: taskforce.com/reviews. ⭐ Average rating is 4.9/5. Reply with "consult" to talk with our team.'
      }
    ]
  }
];

async function seed() {
  console.log('🌱 Seeding 20 automation flows for tech clients...');
  try {
    for (const data of flowsData) {
      // Find client ID by name
      const [clients] = await pool.query('SELECT id FROM clients WHERE name = ? LIMIT 1', [data.clientName]);
      if (!clients.length) {
        console.log(`⚠️ Client not found: "${data.clientName}", skipping.`);
        continue;
      }
      const clientId = clients[0].id;
      console.log(`Adding 4 flows for Client: ${data.clientName} (${clientId})`);

      for (const flow of data.flows) {
        // Delete flow with same name to avoid duplicates
        await pool.query('DELETE FROM flows WHERE client_id = ? AND name = ?', [clientId, flow.name]);

        const flowId = uuidv4();
        const steps = [{ type: 'message', content: flow.msg }];
        
        await pool.query(
          'INSERT INTO flows (id, client_id, name, platform, trigger_type, trigger_value, steps, is_active) VALUES (?, ?, ?, "whatsapp", "keyword", ?, ?, 1)',
          [flowId, clientId, flow.name, flow.trigger, JSON.stringify(steps)]
        );
        console.log(`  └─ Created Flow: "${flow.name}" (triggers on: ${flow.trigger})`);
      }
    }

    console.log('\n🎉 Successfully seeded all 20 Automation Flows!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  }
}

seed();
