module.exports = {
  apps: [{
    name: 'api-server',
    script: '/home/ec2-user/shift-app/api-server/dist/server-new.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: './.env',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: '~/.pm2/logs/api-server-error.log',
    out_file: '~/.pm2/logs/api-server-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
