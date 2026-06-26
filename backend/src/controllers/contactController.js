const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const getContacts = async (req, res) => {
  try {
    const { client_id, platform, tag, lead_status, search, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM contacts WHERE client_id = ?';
    const params = [client_id];

    if (platform) { query += ' AND platform = ?'; params.push(platform); }
    if (lead_status) { query += ' AND lead_status = ?'; params.push(lead_status); }
    if (search) { query += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (tag) { query += ' AND JSON_CONTAINS(tags, ?)'; params.push(JSON.stringify(tag)); }

    query += ' ORDER BY last_message_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM contacts WHERE client_id = ?', [client_id]);

    res.json({ success: true, total, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getContact = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Contact not found' });

    const [messages] = await db.query(
      'SELECT * FROM messages WHERE contact_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json({ success: true, contact: rows[0], messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createContact = async (req, res) => {
  try {
    const { client_id, name, phone, username, platform, platform_id, tags, custom_fields, lead_status } = req.body;
    const id = uuidv4();
    await db.query(
      'INSERT INTO contacts (id, client_id, name, phone, username, platform, platform_id, tags, custom_fields, lead_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, client_id, name, phone, username, platform, platform_id, JSON.stringify(tags || []), JSON.stringify(custom_fields || {}), lead_status || 'cold']
    );
    const [rows] = await db.query('SELECT * FROM contacts WHERE id = ?', [id]);
    res.status(201).json({ success: true, contact: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateContact = async (req, res) => {
  try {
    const { name, phone, lead_status, tags, notes, custom_fields } = req.body;
    await db.query(
      'UPDATE contacts SET name=?, phone=?, lead_status=?, tags=?, notes=?, custom_fields=? WHERE id=?',
      [name, phone, lead_status, JSON.stringify(tags || []), notes, JSON.stringify(custom_fields || {}), req.params.id]
    );
    res.json({ success: true, message: 'Contact updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteContact = async (req, res) => {
  try {
    // Delete all messages for this contact first (cascade clean-up)
    await db.query('DELETE FROM messages WHERE contact_id = ?', [req.params.id]);
    // Then delete the contact
    await db.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Contact and messages deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addTag = async (req, res) => {
  try {
    const { tag } = req.body;
    await db.query(
      "UPDATE contacts SET tags = JSON_ARRAY_APPEND(COALESCE(tags, '[]'), '$', ?) WHERE id = ?",
      [tag, req.params.id]
    );
    res.json({ success: true, message: 'Tag added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Find or create contact when message comes in from webhook
const findOrCreate = async (clientId, platform, platformId, name, phone) => {
  const [rows] = await db.query(
    'SELECT * FROM contacts WHERE client_id = ? AND platform = ? AND platform_id = ?',
    [clientId, platform, platformId]
  );
  if (rows.length) return rows[0];

  const id = uuidv4();
  await db.query(
    'INSERT INTO contacts (id, client_id, name, phone, platform, platform_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, clientId, name || 'Unknown', phone || null, platform, platformId]
  );
  const [newRows] = await db.query('SELECT * FROM contacts WHERE id = ?', [id]);
  return newRows[0];
};

module.exports = { getContacts, getContact, createContact, updateContact, deleteContact, addTag, findOrCreate };
