const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const generateApiKey = () => `nxf_live_${uuidv4().replace(/-/g, '')}`;

const signup = async (req, res) => {
  try {
    const { name, email, password, agency_name } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password required' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const apiKey = generateApiKey();

    await db.query(
      'INSERT INTO users (id, name, email, password, agency_name, api_key) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, email, hashed, agency_name || name + "'s Agency", apiKey]
    );

    const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(201).json({
      success: true,
      token,
      user: { id, name, email, agency_name, api_key: apiKey, plan: 'starter' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, agency_name: user.agency_name, role: user.role, plan: user.plan, api_key: user.api_key }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, plan, agency_name, api_key, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, agency_name } = req.body;
    await db.query('UPDATE users SET name = ?, agency_name = ? WHERE id = ?', [name, agency_name, req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const regenerateApiKey = async (req, res) => {
  try {
    const apiKey = generateApiKey();
    await db.query('UPDATE users SET api_key = ? WHERE id = ?', [apiKey, req.user.id]);
    res.json({ success: true, api_key: apiKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, login, getProfile, updateProfile, regenerateApiKey };
