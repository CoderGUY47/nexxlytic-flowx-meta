const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const commands = [
  {
    keyword: '/start',
    reply_text: 'Welcome! 👋 Thank you for starting a chat with us. Here are the options you can try:\n\n💬 Reply with */help* for assistance\n📞 Reply with */contact* for support details\n❌ Reply with */end* to close this chat.'
  },
  {
    keyword: '/help',
    reply_text: 'Need assistance? 🛠️ Here is what you can do:\n\n1️⃣ Ask about our *pricing*\n2️⃣ Ask about our *services*\n3️⃣ Type */contact* to connect with a support agent.'
  },
  {
    keyword: '/contact',
    reply_text: 'Connect with us! 📞 You can reach our support team directly at support@flowx.com or call us at 8801882652756. We are active Mon-Sat, 10 AM to 6 PM.'
  },
  {
    keyword: '/end',
    reply_text: 'Chat closed. ❌ Thank you for talking to us! Your session has ended. You can start a new chat anytime by typing */start*.'
  }
];

async function seed() {
  console.log('🌱 Seeding command keywords for all clients...');
  try {
    const [clients] = await pool.query('SELECT id, name FROM clients');
    
    for (const client of clients) {
      console.log(`Adding commands for Client: ${client.name} (${client.id})`);
      
      for (const cmd of commands) {
        // Check if keyword already exists for this client to avoid duplicates
        const [existing] = await pool.query(
          'SELECT id FROM keywords WHERE client_id = ? AND keyword = ? LIMIT 1',
          [client.id, cmd.keyword]
        );
        
        if (existing.length) {
          // Update the existing reply_text
          await pool.query(
            'UPDATE keywords SET reply_text = ?, is_active = 1 WHERE id = ?',
            [cmd.reply_text, existing[0].id]
          );
          console.log(`  └─ Updated Keyword: "${cmd.keyword}"`);
        } else {
          // Insert new keyword
          const kwId = uuidv4();
          await pool.query(
            'INSERT INTO keywords (id, client_id, keyword, platform, reply_text, match_type, is_active) VALUES (?, ?, ?, "whatsapp", ?, "exact", 1)',
            [kwId, client.id, cmd.keyword, cmd.reply_text]
          );
          console.log(`  └─ Inserted Keyword: "${cmd.keyword}"`);
        }
      }
    }
    
    console.log('\n🎉 Successfully seeded all command keywords for all clients!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
