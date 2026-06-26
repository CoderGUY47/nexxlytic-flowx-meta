# NEXXLYTIC FlowX — Complete VPS Deployment Guide
# Ubuntu 22.04 LTS

# ================================================
# STEP 1 — VPS Setup (run as root)
# ================================================

apt update && apt upgrade -y
apt install -y nodejs npm nginx mysql-server git certbot python3-certbot-nginx

# Install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# ================================================
# STEP 2 — MySQL Setup
# ================================================

mysql_secure_installation  # Follow prompts

mysql -u root -p << 'EOF'
CREATE DATABASE nexxlytic_flowx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexxlytic_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON nexxlytic_flowx.* TO 'nexxlytic_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

# ================================================
# STEP 3 — Upload & Install Project
# ================================================

# Upload your project folder to /var/www/nexxlytic
mkdir -p /var/www/nexxlytic
cd /var/www/nexxlytic

# Install backend dependencies
cd backend
npm install

# Copy .env and fill your values
cp .env.example .env
nano .env   # Fill DB credentials, API keys etc.

# Run database migration
npm run migrate

# Install frontend dependencies & build
cd ../frontend
npm install
REACT_APP_API_URL=https://yourdomain.com/api npm run build

# ================================================
# STEP 4 — PM2 (Process Manager)
# ================================================

cd /var/www/nexxlytic/backend
pm2 start src/server.js --name "nexxlytic-flowx" --env production
pm2 save
pm2 startup systemd  # Run the command it gives you

# ================================================
# STEP 5 — Nginx Config
# ================================================

cat > /etc/nginx/sites-available/nexxlytic << 'NGINX'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React build)
    location / {
        root /var/www/nexxlytic/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook (no /api prefix)
    location /webhook {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
NGINX

ln -s /etc/nginx/sites-available/nexxlytic /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# ================================================
# STEP 6 — SSL Certificate (free via Let's Encrypt)
# ================================================

certbot --nginx -d yourdomain.com -d www.yourdomain.com

# ================================================
# STEP 7 — Logs directory
# ================================================

mkdir -p /var/www/nexxlytic/backend/logs
pm2 restart nexxlytic-flowx

# ================================================
# USEFUL COMMANDS
# ================================================

pm2 status              # Check app status
pm2 logs nexxlytic-flowx  # View logs
pm2 restart nexxlytic-flowx  # Restart app
pm2 monit               # Real-time monitoring

# View MySQL
mysql -u nexxlytic_user -p nexxlytic_flowx

# ================================================
# STEP 8 — Meta Webhook Setup
# ================================================
# 1. Go to: developers.facebook.com
# 2. Your App → WhatsApp → Configuration
# 3. Webhook URL: https://yourdomain.com/webhook/whatsapp
# 4. Verify token: (same as WA_VERIFY_TOKEN in .env)
# 5. Subscribe to: messages, messaging_postbacks
#
# For Instagram/Facebook:
# Webhook URL: https://yourdomain.com/webhook/meta
# ================================================
