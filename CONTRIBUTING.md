## Contributing to NEXXLYTIC FlowX

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/nexxlytic-flowx-meta.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Install deps: `cd backend && npm install` and `cd frontend && npm install`
5. Copy `.env.example` to `.env` and fill in your values

### Making Changes

- Keep commits small and focused
- Use the commit message format: `<file> is created/updated and the issue has solved`
- Test your changes locally before pushing

### Pull Request Process

1. Push your branch: `git push origin feature/your-feature-name`
2. Open a PR against `main`
3. Describe what you changed and why
4. Wait for review

### Code Style

- **Backend**: Standard Node.js / Express patterns, async/await
- **Frontend**: React functional components + hooks
- Use `const` over `let` where possible
- Always handle errors in async functions

### Reporting Bugs

Open a GitHub Issue with:
- Steps to reproduce
- Expected vs actual behavior
- Your Node.js and npm version
