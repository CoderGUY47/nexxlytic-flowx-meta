# NEXXLYTIC FlowX — Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please **do NOT** open a public GitHub issue.

Instead, email: **security@nexxlytic.com**

We will respond within 48 hours and provide a fix timeline.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |

## Security Best Practices (for deployment)

- Always use strong, randomly generated `JWT_SECRET` (64+ chars)
- Never commit `.env` files to git
- Rotate `WA_ACCESS_TOKEN` and `META_PAGE_ACCESS_TOKEN` regularly
- Use HTTPS only in production (`NODE_ENV=production`)
- Keep `node_modules` out of Docker images and git
