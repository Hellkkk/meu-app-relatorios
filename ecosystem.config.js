module.exports = {
  apps: [
    {
      name: 'relatorios-backend',
      script: 'server.js',
      cwd: process.env.APP_DIR || '/home/ec2-user/meu-app-relatorios',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        BACKEND_PORT: 5001,
        BACKEND_HOST: '127.0.0.1'
      },
      error_file: process.env.LOG_DIR ? `${process.env.LOG_DIR}/relatorios-backend-error.log` : '/home/ec2-user/.pm2/logs/relatorios-backend-error.log',
      out_file: process.env.LOG_DIR ? `${process.env.LOG_DIR}/relatorios-backend-out.log` : '/home/ec2-user/.pm2/logs/relatorios-backend-out.log',
      log_file: process.env.LOG_DIR ? `${process.env.LOG_DIR}/relatorios-backend.log` : '/home/ec2-user/.pm2/logs/relatorios-backend.log'
    },
    {
      name: 'relatorios-frontend',
      script: 'frontend-server.js',
      cwd: process.env.APP_DIR || '/home/ec2-user/meu-app-relatorios',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        FRONTEND_PORT: 3001,
        BACKEND_PORT: 5001,
        BACKEND_HOST: '127.0.0.1'
      },
      error_file: process.env.LOG_DIR ? `${process.env.LOG_DIR}/relatorios-frontend-error.log` : '/home/ec2-user/.pm2/logs/relatorios-frontend-error.log',
      out_file: process.env.LOG_DIR ? `${process.env.LOG_DIR}/relatorios-frontend-out.log` : '/home/ec2-user/.pm2/logs/relatorios-frontend-out.log',
      log_file: process.env.LOG_DIR ? `${process.env.LOG_DIR}/relatorios-frontend.log` : '/home/ec2-user/.pm2/logs/relatorios-frontend.log'
    }
  ]
};