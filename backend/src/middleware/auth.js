const jwt = require('jsonwebtoken');
const db = require('../config/db');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query(
      'SELECT id, name, email, role, plan, agency_name FROM users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });

    req.user = rows[0];
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    res.status(401).json({ error: isExpired ? 'Token expired, please login again' : 'Invalid or expired token' });
  }
};

// API key auth (for SDK/mobile)
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey) return res.status(401).json({ error: 'API key required' });

    const [rows] = await db.query(
      'SELECT id, name, email, role, plan FROM users WHERE api_key = ? AND is_active = 1',
      [apiKey]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid API key' });

    req.user = rows[0];
    next();
  } catch (err) {
    res.status(401).json({ error: 'Auth error' });
  }
};

// Accept JWT or API key
const flexAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return apiKeyAuth(req, res, next);
  return auth(req, res, next);
};

module.exports = { auth, apiKeyAuth, flexAuth };
