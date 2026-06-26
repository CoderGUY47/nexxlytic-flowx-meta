module.exports = {
  apps: [{
    name: 'nexxlytic-flowx',
    script: 'src/server.js',
    cwd: '/var/www/nexxlytic/backend',
    instances: 2,          // 2 CPU cores use karein
    exec_mode: 'cluster',  // Load balancing
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '500M',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    watch: false,
    autorestart: true,
    restart_delay: 3000
  }]
};
