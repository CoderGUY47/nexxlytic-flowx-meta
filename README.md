<div align="center">

# 🤖 NEXXLYTIC FlowX

### Premium WhatsApp & Meta Chat Automation Platform

*Bridging automated visual workflows with conversion-optimized messaging auto-replies.*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-nexxlytic--flowx--meta.vercel.app-2563eb?style=for-the-badge)](https://nexxlytic-flowx-meta.vercel.app/)
&nbsp;
[![React 18](https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
&nbsp;
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
&nbsp;
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

</div>

---

## 📖 Table of Contents

- [✨ Overview](#-overview)
- [🚀 Live Links](#-live-links)
- [❌ The Problem &amp; ✅ The Solution](#-the-problem---the-solution)
- [🚀 Key Features](#-key-features)
- [📦 Tech Stack &amp; Architecture](#-tech-stack--architecture)
- [🛠️ Installation &amp; Setup](#-installation--setup)
- [🚢 Production Deployment](#-production-deployment)
- [🤝 Contributing](#-contributing)

---

## ✨ Overview

**NEXXLYTIC FlowX** is a high-performance, full-stack chat automation and customer engagement platform. Designed as a unified monorepo containing a **React 18 frontend dashboard** and a **decoupled Express.js API gateway backend**, the application serves as the premium engine for automating client communications across WhatsApp and Instagram.

It provides real-time analytics, keyword-based trigger responses, broadcast messaging, and an automated AI-pilot assistant leveraging OpenAI and OpenRouter APIs. Under a single, unified Vercel configuration, the platform deploys both static frontend resources and serverless Node.js backend functions securely.

---

## ❌ The Problem & ✅ The Solution

> **Chat automation shouldn't require complex visual bloat or fragmented hosting layouts.**

Traditional messaging automation systems are overly complex to configure, expensive to host, lack unified cross-platform inboxes, and expose API credentials. 

| ❌ The Problem                                               | ✅ FlowX's Solution                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Scattered control panels for WhatsApp and Instagram          | A unified dashboard mapping both platforms into a single chat experience    |
| Exposed API keys and hardcoded database connection tokens    | Environment-driven backend with strict JWT and API key verification middleware |
| Expensive dual-hosting setups for frontend and API servers  | Single Vercel project deployment with structured file and function routing   |
| Flat, unengaging data presentations for customer chats       | Interactive, sleek graphs and summaries built on **Recharts**               |
| Read-only EROFS server crashes due to local disk logging     | Conditional winston logging that adapts dynamically to Vercel's environment   |

---

## 🚀 Live Links

*   **Live Production App:** [https://nexxlytic-flowx-meta.vercel.app](https://nexxlytic-flowx-meta.vercel.app)
*   **API Health Status:** [https://nexxlytic-flowx-meta.vercel.app/api/health](https://nexxlytic-flowx-meta.vercel.app/api/health)

---

## 🚀 Key Features

*   **Unified Client Dashboard**: Manage different business clients and active API configurations from a single interface.
*   **Real-time Metrics & Analytics**: Visual summary graphs of message trends, active conversations, and platform-specific usage.
*   **Keyword Trigger System**: Set up auto-replies matching specific keywords (`exact`, `contains`, or `starts_with`) for incoming WhatsApp and Instagram messages.
*   **Broadcast Campaigns**: Compose marketing or support templates and broadcast them in bulk to your contacts.
*   **AI Autopilot Assistant**: Auto-generate smart conversational replies and captions utilizing advanced language models.
*   **Payment Tracking (Optional)**: In-app billing status verification utilizing the Razorpay integration.

---

## 📦 Tech Stack & Architecture

### Frontend
*   **Framework**: React v18.2 (Create React App structure)
*   **Routing**: React Router DOM v6
*   **Charts**: Recharts (for analytics dashboards)
*   **WebSockets**: Socket.io-client for real-time live inbox notifications

### Backend
*   **Engine**: Node.js & Express.js (Modular Route design)
*   **Database**: MySQL (optimized pools, UTF8mb4 support, keep-alive configurations)
*   **Authentication**: JWT (JSON Web Tokens) with Token Expired handling & Header API Key validation
*   **Logging**: Winston Logger (with file-rotation locally and standard output on Vercel)

---

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   MySQL Server (v8+)

### 1. Clone & Configure Environments
```bash
git clone https://github.com/CoderGUY47/nexxlytic-flowx-meta.git
cd nexxlytic-flowx-meta
```

Create `backend/.env` based on `backend/.env.example` and populate it with your local credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=flowx
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
```

### 2. Install & Start Backend
```bash
cd backend
npm install
npm run migrate # Run MySQL schema migrations
npm run dev     # Starts backend on http://localhost:5000
```

### 3. Install & Start Frontend (New Terminal)
```bash
cd frontend
npm install
npm start       # Starts React on http://localhost:3000
```

---

## 🚢 Production Deployment

This project deploys as a single monorepo unit on Vercel using `vercel.json` routing configuration:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    },
    {
      "src": "backend/src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/src/server.js" },
    { "src": "/meta/(.*)", "dest": "backend/src/server.js" },
    { "src": "/webhook/(.*)", "dest": "backend/src/server.js" },
    { "src": "/meta", "dest": "backend/src/server.js" },
    { "src": "/webhook", "dest": "backend/src/server.js" },
    { "src": "/health", "dest": "backend/src/server.js" },
    { "src": "/vr-promo.png", "dest": "backend/src/server.js" },
    { "src": "/(.*)", "dest": "frontend/$1" }
  ]
}
```

Make sure all Vercel environment variables match the keys in your `backend/.env` file.

---

## 🤝 Contributing

1. Fork the project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m "added amazing feature done"`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.
