# NEXXLYTIC FlowX — Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] — 2026-06-26

### Added
- Initial monorepo setup with `frontend/` and `backend/` folders
- Vercel monorepo deployment config (`vercel.json`)
- Express.js backend with Socket.IO real-time inbox
- React 18 frontend with React Router v6
- JWT authentication system
- WhatsApp Cloud API integration (send/receive messages)
- Instagram / Facebook Graph API integration
- AI-powered flow engine (Claude / OpenRouter)
- Keyword-based auto-reply system
- Contact management
- Broadcast messaging
- Analytics dashboard
- PM2 ecosystem config for VPS deployment
- Automated deploy script (`DEPLOY.sh`)
- Comprehensive `.gitignore` for monorepo

### Security
- `.env` files excluded from git
- Secrets cleaned from `tech_clients_data.js`
- Anthropic key removed from `.env.example`
