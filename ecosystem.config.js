module.exports = {
  apps: [
    {
      name: 'relatorios-backend',
      script: 'server.js',
      cwd: '/home/ec2-user/meu-app-relatorios/meu-app-relatorios',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        BACKEND_PORT: 5001,
        BACKEND_HOST: '127.0.0.1'
      },
      env_production: {
        NODE_ENV: 'production',
        BACKEND_PORT: 5001,
        BACKEND_HOST: '127.0.0.1'
      },
      error_file: '/home/ec2-user/.pm2/logs/relatorios-backend-error.log',
      out_file: '/home/ec2-user/.pm2/logs/relatorios-backend-out.log',
      log_file: '/home/ec2-user/.pm2/logs/relatorios-backend.log'
    },
    {
      name: 'relatorios-frontend',
      script: 'frontend-server.js',
      cwd: '/home/ec2-user/meu-app-relatorios/meu-app-relatorios',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        FRONTEND_PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        FRONTEND_PORT: 3001
      },
      error_file: '/home/ec2-user/.pm2/logs/relatorios-frontend-error.log',
      out_file: '/home/ec2-user/.pm2/logs/relatorios-frontend-out.log',
      log_file: '/home/ec2-user/.pm2/logs/relatorios-frontend.log'
    }
  ]
};