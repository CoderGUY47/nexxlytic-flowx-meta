# Vercel Monorepo Deployment Notes

## How This Works

This project uses a single Vercel project to serve both the React frontend and Node.js backend from one GitHub repository.

### Route Strategy (`vercel.json`)

| Pattern | Handler |
|---|---|
| `/api/*` | `backend/src/server.js` (Node.js serverless) |
| `/webhook/*` | `backend/src/server.js` |
| `/meta/*` | `backend/src/server.js` |
| `/health` | `backend/src/server.js` |
| `/socket.io/*` | `backend/src/server.js` |
| `/*` | `frontend/build/` (static React) |

### Important Notes

- **Socket.IO**: Vercel serverless functions do not support persistent WebSocket connections. For real-time inbox, use a separate service (Railway, Render, or VPS) for the backend, and only serve the frontend on Vercel.
- **Database**: MySQL is NOT hosted on Vercel. Use PlanetScale, Railway, or your own VPS for the database.
- **Environment Variables**: Add all variables from `backend/.env.example` in Vercel → Settings → Environment Variables.
- **Cold Starts**: First request to the backend may take 2-5 seconds (Vercel serverless cold start). This is normal.

### Build Configuration

Vercel auto-detects settings from `vercel.json`. No manual build config needed in the dashboard.

### Recommended Production Stack

| Service | Provider |
|---|---|
| Frontend | Vercel (free) |
| Backend API | Railway / Render / VPS |
| Database | PlanetScale / Railway MySQL |
| Real-time (Socket.IO) | Same server as backend |
