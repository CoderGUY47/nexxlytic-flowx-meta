const pool = require('./db');

/**
 * Run all pending DB migrations for NEXXLYTIC FlowX
 * Safe to run multiple times (uses IF NOT EXISTS)
 */
async function migrate() {
  console.log('🗄️  Running NEXXLYTIC FlowX migrations...');

  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','manager','agent') DEFAULT 'admin',
      agency_name VARCHAR(150),
      plan ENUM('starter','agency','whitelabel') DEFAULT 'starter',
      api_key VARCHAR(100) UNIQUE,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Clients table
    `CREATE TABLE IF NOT EXISTS clients (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      business_name VARCHAR(150),
      wa_phone_number_id VARCHAR(100),
      wa_access_token TEXT,
      ig_page_token TEXT,
      fb_page_token TEXT,
      fb_page_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      client_id VARCHAR(36) NOT NULL,
      name VARCHAR(100),
      phone VARCHAR(30),
      username VARCHAR(100),
      platform ENUM('whatsapp','instagram','facebook','telegram') NOT NULL,
      platform_id VARCHAR(200),
      tags JSON,
      custom_fields JSON,
      lead_status ENUM('cold','warm','hot','customer','lost') DEFAULT 'cold',
      notes TEXT,
      last_message_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      current_flow_id VARCHAR(36),
      current_node_id VARCHAR(50),
      expect_input VARCHAR(50),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Flows table
    `CREATE TABLE IF NOT EXISTS flows (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      client_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      platform ENUM('whatsapp','instagram','facebook','all') DEFAULT 'whatsapp',
      trigger_type ENUM('keyword','new_subscriber','button_click','api') DEFAULT 'keyword',
      trigger_value VARCHAR(200),
      steps JSON NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      total_triggered INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Keywords table
    `CREATE TABLE IF NOT EXISTS keywords (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      client_id VARCHAR(36) NOT NULL,
      keyword VARCHAR(200) NOT NULL,
      platform ENUM('whatsapp','instagram','facebook','all') DEFAULT 'all',
      reply_text TEXT,
      reply_type ENUM('text','flow') DEFAULT 'text',
      flow_id VARCHAR(36),
      match_type ENUM('exact','contains','starts_with') DEFAULT 'contains',
      is_active TINYINT(1) DEFAULT 1,
      hit_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      post_id VARCHAR(100),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Messages table
    `CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      client_id VARCHAR(36) NOT NULL,
      contact_id VARCHAR(36),
      direction ENUM('inbound','outbound') NOT NULL,
      platform ENUM('whatsapp','instagram','facebook') NOT NULL,
      message_type ENUM('text','image','video','audio','document','button','list') DEFAULT 'text',
      content TEXT,
      media_url TEXT,
      status ENUM('sent','delivered','read','failed') DEFAULT 'sent',
      wa_message_id VARCHAR(200),
      is_ai_reply TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    )`,

    // Broadcasts table
    `CREATE TABLE IF NOT EXISTS broadcasts (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      client_id VARCHAR(36) NOT NULL,
      segment VARCHAR(100) DEFAULT 'all',
      message TEXT NOT NULL,
      message_type ENUM('text','image') DEFAULT 'text',
      status ENUM('draft','scheduled','sending','sent','failed') DEFAULT 'draft',
      scheduled_at TIMESTAMP NULL DEFAULT NULL,
      sent_at TIMESTAMP NULL DEFAULT NULL,
      total_recipients INT DEFAULT 0,
      sent_count INT DEFAULT 0,
      delivered_count INT DEFAULT 0,
      opened_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Payments table
    `CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      client_id VARCHAR(36) NOT NULL,
      contact_id VARCHAR(36),
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
      payment_gateway ENUM('razorpay','stripe','manual') DEFAULT 'manual',
      gateway_payment_id VARCHAR(200),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    )`,

    // Drip campaigns table
    `CREATE TABLE IF NOT EXISTS drip_campaigns (
      id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
      client_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      platform ENUM('whatsapp','instagram','facebook') DEFAULT 'whatsapp',
      steps JSON NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`
  ];

  for (const query of queries) {
    await pool.query(query);
  }

  console.log('✅ All migrations completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
