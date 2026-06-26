const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const metaRoutes = require('./routes/meta');
const db = require('./config/db');
const logger = require('./config/logger');

// Routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const contactRoutes = require('./routes/contacts');
const messageRoutes = require('./routes/messages');
const flowRoutes = require('./routes/flows');
const keywordRoutes = require('./routes/keywords');
const broadcastRoutes = require('./routes/broadcasts');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhooks');
const metaWebhookRoutes = require('./routes/metaWebhook');
const aiRoutes = require('./routes/ai');
const facebookOAuth = require('./routes/facebookOAuth');
const paymentRoutes = require('./routes/payments');
const manychatWebhook = require('./routes/manychatWebhook');

const app = express();
const httpServer = createServer(app);

// Trust proxy (required for ngrok / reverse proxy support)
app.set('trust proxy', 1);

// Socket.io for real-time inbox
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'https://yourdomain.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST']
  }
});

// Make io accessible in routes
app.set('io', io);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://yourdomain.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please slow down.' },
  validate: { trustProxy: false }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Active client tracking middleware for sandbox environment
app.use((req, res, next) => {
  const clientId = req.query.client_id || req.body.client_id;
  if (clientId) {
    global.lastActiveClient = clientId;
  }
  next();
});

// Health check (supports both local and Vercel routing paths)
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    product: 'NEXXLYTIC FlowX',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve generated test image for Instagram publish test
app.get(['/vr-promo.png', '/api/vr-promo.png'], (req, res) => {
  res.sendFile(require('path').join(__dirname, 'vortex_vr_promo.png'));
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/oauth', facebookOAuth);
app.use('/api/payments', paymentRoutes);
app.use('/api/manychat', manychatWebhook);
// Webhooks (no auth needed - verified by token)
app.use('/meta', metaRoutes);
app.use('/webhook/meta', metaWebhookRoutes);
app.use('/webhook', webhookRoutes);

// Socket.io real-time
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join_client', (clientId) => {
    socket.join(`client_${clientId}`);
    logger.info(`Socket joined client room: ${clientId}`);
  });

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`Socket joined user room: ${userId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Conditionally start local HTTP server if not in Vercel environment
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    logger.info(`🚀 NEXXLYTIC FlowX running on port ${PORT}`);
  });
}

module.exports = app;
