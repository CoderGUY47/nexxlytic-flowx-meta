# NEXXLYTIC FlowX — Vercel Deployment Guide

## Project Structure (Monorepo)

```
nexxlytic-flowx/
├── frontend/         # React 18 app  → served at /
├── backend/          # Node.js API   → served at /api/*
├── vercel.json       # Routing config
└── .gitignore
```

## One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/CoderGUY47/nexxlytic-flowx-meta)

## Local Development

```bash
# Backend
cd backend
npm install
npm run dev        # runs on :5000

# Frontend (in another terminal)
cd frontend
npm install
npm start          # runs on :3000, proxies API to :5000
```

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in your real values.

See full variable list in the [Environment Variables section](./backend/.env.example).

## Vercel Routes

| Path          | Destination         |
|---------------|---------------------|
| `/api/*`      | Backend (Node.js)   |
| `/webhook/*`  | Backend (Node.js)   |
| `/meta/*`     | Backend (Node.js)   |
| `/health`     | Backend health check|
| `/*`          | Frontend (React)    |

## Tech Stack

- **Frontend**: React 18, React Router v6, Socket.IO Client, Recharts
- **Backend**: Express.js, MySQL2, Socket.IO, JWT, Winston
- **Deployment**: Vercel (monorepo, single project)
- **AI**: OpenRouter / Anthropic Claude
- **Messaging**: Meta Cloud API (WhatsApp + Instagram)
