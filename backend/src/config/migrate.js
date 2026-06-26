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
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role ENUM('admin','user') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Clients table
    `CREATE TABLE IF NOT EXISTS clients (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      business_name VARCHAR(255),
      wa_phone_number_id VARCHAR(255),
      wa_access_token TEXT,
      ig_user_id VARCHAR(255),
      meta_page_access_token TEXT,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
      id VARCHAR(36) PRIMARY KEY,
      client_id VARCHAR(36) NOT NULL,
      wa_number VARCHAR(50),
      ig_user_id VARCHAR(255),
      name VARCHAR(255),
      platform ENUM('whatsapp','instagram') DEFAULT 'whatsapp',
      last_seen TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Messages table
    `CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      client_id VARCHAR(36) NOT NULL,
      contact_id VARCHAR(36),
      direction ENUM('inbound','outbound') NOT NULL,
      platform ENUM('whatsapp','instagram') DEFAULT 'whatsapp',
      type VARCHAR(50) DEFAULT 'text',
      content TEXT,
      wa_message_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Flows table
    `CREATE TABLE IF NOT EXISTS flows (
      id VARCHAR(36) PRIMARY KEY,
      client_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      platform ENUM('whatsapp','instagram') DEFAULT 'whatsapp',
      trigger_type VARCHAR(50),
      trigger_value TEXT,
      steps JSON,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Keywords table
    `CREATE TABLE IF NOT EXISTS keywords (
      id VARCHAR(36) PRIMARY KEY,
      client_id VARCHAR(36) NOT NULL,
      keyword VARCHAR(255) NOT NULL,
      platform ENUM('whatsapp','instagram') DEFAULT 'whatsapp',
      reply_text TEXT,
      match_type ENUM('exact','contains','starts_with') DEFAULT 'contains',
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Broadcasts table
    `CREATE TABLE IF NOT EXISTS broadcasts (
      id VARCHAR(36) PRIMARY KEY,
      client_id VARCHAR(36) NOT NULL,
      name VARCHAR(255),
      message TEXT,
      platform ENUM('whatsapp','instagram') DEFAULT 'whatsapp',
      status ENUM('draft','sending','sent','failed') DEFAULT 'draft',
      sent_count INT DEFAULT 0,
      failed_count INT DEFAULT 0,
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
