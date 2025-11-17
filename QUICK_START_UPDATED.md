# Quick Start Guide - Updated Port Configuration

## For Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
```env
BACKEND_PORT=5001
FRONTEND_PORT=3001
MONGODB_URI=mongodb://localhost:27017/relatorios
JWT_SECRET=your_secret_key_here
CLIENT_URL=http://localhost:3001
```

### 3. Build Frontend
```bash
npm run client:build
```

### 4. Start Both Servers

**Option A: Manual (for development)**
```bash
# Terminal 1 - Backend API
npm run start:api

# Terminal 2 - Frontend Proxy
npm run start:web
```

**Option B: Using PM2 (recommended)**
```bash
npm run pm2:start
```

### 5. Verify Everything Works
```bash
npm run verify:ports
```

You should see:
```
✅ ALL SYSTEMS OPERATIONAL
   Frontend: http://localhost:3001
   Backend: http://localhost:5001
```

### 6. Access Application
Open browser: http://localhost:3001

## For EC2 Production Deployment

### 1. SSH into EC2
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 2. Clone/Update Repository
```bash
cd /home/ec2-user
git clone https://github.com/Hellkkk/meu-app-relatorios.git
# OR if already cloned:
cd meu-app-relatorios
git pull origin main
```

### 3. Configure Environment
```bash
cp .env.production .env
nano .env
```

Update these values:
```env
BACKEND_PORT=5001
FRONTEND_PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/relatorios
JWT_SECRET=generate_a_secure_key_here
CLIENT_URL=http://your-ec2-ip:3001
```

### 4. Run Deployment Script
```bash
npm run deploy:amazon
```

This will:
- Install dependencies
- Build frontend
- Start both servers with PM2
- Save PM2 configuration

### 5. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Should show:
# relatorios-backend (online)
# relatorios-frontend (online)

# Verify health
npm run verify:ports

# Or manually:
curl http://127.0.0.1:5001/api/health
curl http://127.0.0.1:3001/api/health
```

### 6. Access Application
Open browser: http://your-ec2-ip:3001

## Troubleshooting

### Login shows ECONNREFUSED error

**Check both processes are running:**
```bash
pm2 status
```

**If backend is down:**
```bash
pm2 logs relatorios-backend --lines 50
pm2 restart relatorios-backend
```

**If frontend is down:**
```bash
pm2 logs relatorios-frontend --lines 50
pm2 restart relatorios-frontend
```

**Verify environment variables:**
```bash
cat .env | grep -E "BACKEND_PORT|FRONTEND_PORT"
```

### Both processes running but still getting errors

**Test endpoints directly:**
```bash
# Backend health
curl http://127.0.0.1:5001/api/health

# Frontend proxy health
curl http://127.0.0.1:3001/health

# Frontend proxying to backend
curl http://127.0.0.1:3001/api/health
```

**Check for port conflicts:**
```bash
# Linux/Mac
lsof -i :5001
lsof -i :3001

# Should show Node processes on both ports
```

### Need to restart everything

```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
npm run verify:ports
```

### Check logs

```bash
# All logs
pm2 logs

# Specific service
pm2 logs relatorios-backend
pm2 logs relatorios-frontend

# Last 50 lines
pm2 logs --lines 50
```

## Common PM2 Commands

```bash
# Start services
pm2 start ecosystem.config.js

# Stop services
pm2 stop all

# Restart services
pm2 restart all

# Delete services
pm2 delete all

# Status
pm2 status

# Logs
pm2 logs

# Monitor
pm2 monit

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

## Important Notes

1. **Two processes required**: The application needs both backend (5001) and frontend (3001) running
2. **Use verify script**: Always run `npm run verify:ports` after starting services
3. **Check PM2 status**: Use `pm2 status` to confirm both processes are online
4. **Port conflicts**: Ensure no other services are using ports 5001 or 3001
5. **Environment vars**: Make sure BACKEND_PORT and FRONTEND_PORT are set correctly

## Default Ports

- **Backend API**: 5001 (configurable via `BACKEND_PORT`)
- **Frontend Proxy**: 3001 (configurable via `FRONTEND_PORT`)
- **MongoDB**: 27017 (if local) or Atlas connection string

## Security Group Configuration (EC2)

Make sure these ports are open in your EC2 Security Group:
- 22 (SSH)
- 3001 (Frontend - HTTP)
- 5001 (Backend API - HTTP)
- 443 (HTTPS - optional, for SSL)

## Need Help?

1. Check the troubleshooting section in README.md
2. Review DEPLOY.md for detailed deployment instructions
3. Check PORT_CONFIGURATION_FIX.md for implementation details
4. Run `npm run verify:ports` to diagnose issues
