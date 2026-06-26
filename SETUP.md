# NEXXLYTIC FlowX — Environment Setup Checklist

Use this checklist when setting up a new environment (local, staging, or production).

## Backend Checklist

- [ ] Copy `backend/.env.example` → `backend/.env`
- [ ] Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- [ ] Generate a strong `JWT_SECRET` (run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] Set `WA_PHONE_NUMBER_ID` and `WA_ACCESS_TOKEN` from Meta Developer Console
- [ ] Set `WA_VERIFY_TOKEN` (any random string, used for webhook verification)
- [ ] Set `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`
- [ ] Set `OPENAI_API_KEY` (OpenRouter or OpenAI key)
- [ ] Set `FRONTEND_URL` to your domain (for CORS)
- [ ] Run `npm run migrate` to create database tables
- [ ] Start with `npm start` or `pm2 start ecosystem.config.js --env production`

## Frontend Checklist

- [ ] Copy `frontend/.env.example` → `frontend/.env.local`
- [ ] Set `REACT_APP_API_URL` to your backend URL + `/api`
- [ ] Set `REACT_APP_SOCKET_URL` to your backend URL
- [ ] Run `npm run build` for production
- [ ] Run `npm start` for local development

## Vercel Deployment Checklist

- [ ] Import GitHub repo into Vercel
- [ ] Set root directory to `/` (monorepo)
- [ ] Add all env variables from `backend/.env.example` in Vercel project settings
- [ ] Set `FRONTEND_URL` to your Vercel deployment URL
- [ ] Deploy and test `/health` endpoint

## Meta Webhook Checklist

- [ ] Set webhook URL to: `https://your-domain.vercel.app/webhook`
- [ ] Set verify token to match `WA_VERIFY_TOKEN` in your `.env`
- [ ] Subscribe to: `messages`, `messaging_postbacks`, `feed`, `mention`
