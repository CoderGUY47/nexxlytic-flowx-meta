const mysql = require('mysql2/promise');
require('dotenv').config();

const schema = `
CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;
USE \`${process.env.DB_NAME}\`;

-- Users / Agency accounts
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','manager','agent') DEFAULT 'admin',
  agency_name VARCHAR(150),
  plan ENUM('starter','agency','whitelabel') DEFAULT 'starter',
  api_key VARCHAR(100) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clients (agencies manage multiple clients)
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
);

-- Contacts / Subscribers
CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client_platform (client_id, platform),
  INDEX idx_phone (phone)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id VARCHAR(36) NOT NULL,
  contact_id VARCHAR(36),
  direction ENUM('inbound','outbound') NOT NULL,
  platform ENUM('whatsapp','instagram','facebook') NOT NULL,
  message_type ENUM('text','image','video','audio','document','button','list') DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  status ENUM('sent','delivered','read','failed') DEFAULT 'sent',
  wa_message_id VARCHAR(200),
  is_ai_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  INDEX idx_client_contact (client_id, contact_id),
  INDEX idx_created (created_at)
);

-- Flows (automation)
CREATE TABLE IF NOT EXISTS flows (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  platform ENUM('whatsapp','instagram','facebook','all') DEFAULT 'whatsapp',
  trigger_type ENUM('keyword','new_subscriber','button_click','api') DEFAULT 'keyword',
  trigger_value VARCHAR(200),
  steps JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  total_triggered INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Keywords
CREATE TABLE IF NOT EXISTS keywords (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id VARCHAR(36) NOT NULL,
  keyword VARCHAR(200) NOT NULL,
  platform ENUM('whatsapp','instagram','facebook','all') DEFAULT 'all',
  reply_text TEXT,
  reply_type ENUM('text','flow') DEFAULT 'text',
  flow_id VARCHAR(36),
  match_type ENUM('exact','contains','starts_with') DEFAULT 'contains',
  is_active BOOLEAN DEFAULT TRUE,
  hit_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Broadcasts
CREATE TABLE IF NOT EXISTS broadcasts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id VARCHAR(36) NOT NULL,
  name VARCHAR(150),
  platform ENUM('whatsapp','instagram','facebook') NOT NULL,
  segment VARCHAR(100) DEFAULT 'all',
  message TEXT NOT NULL,
  message_type ENUM('text','image') DEFAULT 'text',
  status ENUM('draft','scheduled','sending','sent','failed') DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Drip campaigns
CREATE TABLE IF NOT EXISTS drip_campaigns (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  platform ENUM('whatsapp','instagram','facebook') DEFAULT 'whatsapp',
  steps JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Analytics
CREATE TABLE IF NOT EXISTS analytics (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  platform VARCHAR(20),
  messages_sent INT DEFAULT 0,
  messages_delivered INT DEFAULT 0,
  messages_opened INT DEFAULT 0,
  new_contacts INT DEFAULT 0,
  flows_triggered INT DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE KEY unique_client_date_platform (client_id, date, platform)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id VARCHAR(36) NOT NULL,
  contact_id VARCHAR(36),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  payment_gateway ENUM('razorpay','stripe','manual') DEFAULT 'manual',
  gateway_payment_id VARCHAR(200),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
`;

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });
  console.log('Connected to MySQL...');
  await conn.query(schema);
  console.log('✅ All tables created successfully!');
  await conn.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
