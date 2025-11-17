# Verification Guide - Frontend Proxy and Nginx Configuration

This document provides verification steps for the frontend proxy architecture and Nginx configuration changes.

## Changes Summary

### 1. Environment Configuration
- ✅ Updated `.env.example` with CORS_ORIGIN documentation
- ✅ Updated `.env.production` with proper CLIENT_URL and CORS_ORIGIN for EC2

### 2. Backend (server.js)
- ✅ Enhanced CORS to handle multiple origins from CORS_ORIGIN env variable
- ✅ Always includes http://3.14.182.194 and http://3.14.182.194:3001

### 3. Frontend Proxy (frontend-server.js)
- ✅ Returns 502 Bad Gateway on ECONNREFUSED instead of 500
- ✅ Enhanced error logging with error codes

### 4. Nginx Configuration
- ✅ Created `nginx/app-relatorios.conf` for port 80 access
- ✅ Created `scripts/nginx/install-config.sh` installation script

### 5. Documentation
- ✅ Updated README.md with architecture and CORS details
- ✅ Updated DEPLOY.md with Nginx setup and troubleshooting

## Architecture Overview

```
Production with Nginx (Port 80):
┌─────────────────────────────────────────────────┐
│ Client Browser (http://3.14.182.194/)          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Nginx (Port 80)                                 │
│  ├─ /api/* → Backend API (127.0.0.1:5001)      │
│  └─ /*     → Frontend Proxy (127.0.0.1:3001)   │
└───────────┬──────────────────┬──────────────────┘
            │                  │
            ▼                  ▼
┌──────────────────┐  ┌──────────────────────────┐
│ Backend API      │  │ Frontend Proxy           │
│ (Port 5001)      │  │ (Port 3001)              │
│ - Express        │  │ - Serves SPA             │
│ - MongoDB        │  │ - Proxies /api to 5001   │
│ - JWT Auth       │  └──────────────────────────┘
└──────────────────┘
```

## Verification Steps

### Local Testing (Development)

1. **Start the backend:**
   ```bash
   npm run start:api
   # Should bind to port 5001
   ```

2. **Verify backend health:**
   ```bash
   curl http://127.0.0.1:5001/api/health
   # Expected: {"success":true,"message":"Server is running",...}
   ```

3. **Start the frontend proxy:**
   ```bash
   npm run start:web
   # Should bind to port 3001
   ```

4. **Verify frontend proxy:**
   ```bash
   # Test proxy health
   curl http://127.0.0.1:3001/health
   # Expected: {"success":true,"message":"Frontend proxy server is running",...}
   
   # Test API proxy
   curl http://127.0.0.1:3001/api/health
   # Expected: Same as backend (proxied through)
   ```

### PM2 Testing

1. **Start with PM2:**
   ```bash
   npm run pm2:start
   ```

2. **Check PM2 status:**
   ```bash
   pm2 status
   # Should show:
   # - relatorios-backend (online, port 5001)
   # - relatorios-frontend (online, port 3001)
   ```

3. **Verify ports:**
   ```bash
   npm run verify:ports
   # or
   node scripts/verify-ports.js
   ```

### Nginx Testing (Production EC2)

1. **Install Nginx (if not installed):**
   ```bash
   # Amazon Linux
   sudo yum install nginx -y
   sudo systemctl enable nginx
   sudo systemctl start nginx
   
   # Ubuntu
   sudo apt install nginx -y
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

2. **Install app configuration:**
   ```bash
   cd /home/ec2-user/meu-app-relatorios  # or your app directory
   sudo ./scripts/nginx/install-config.sh
   ```

3. **Verify Nginx is running:**
   ```bash
   sudo systemctl status nginx
   # Should show: active (running)
   ```

4. **Test port 80 locally:**
   ```bash
   # Test API access
   curl http://localhost/api/health
   # Expected: Backend health response
   
   # Test frontend access
   curl http://localhost/
   # Expected: HTML content of the SPA
   ```

5. **Test from external (your computer):**
   ```bash
   # Replace 3.14.182.194 with your EC2 IP
   curl http://3.14.182.194/api/health
   
   # Or open in browser:
   # http://3.14.182.194/
   ```

### CORS Testing

1. **Test from browser console:**
   ```javascript
   // Open http://3.14.182.194/ in browser
   // Open developer console and run:
   fetch('/api/health')
     .then(r => r.json())
     .then(console.log)
   // Should work without CORS errors
   ```

2. **Test from port 3001:**
   ```javascript
   // Open http://3.14.182.194:3001/ in browser
   // Should also work without CORS errors
   ```

## Environment Variables Checklist

### Development (.env)
```env
BACKEND_PORT=5001
BACKEND_HOST=127.0.0.1
FRONTEND_PORT=3001
CLIENT_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/relatorios
JWT_SECRET=your_secret_here
```

### Production (.env on EC2)
```env
NODE_ENV=production
BACKEND_PORT=5001
BACKEND_HOST=127.0.0.1
FRONTEND_PORT=3001
CLIENT_URL=http://3.14.182.194:3001
CORS_ORIGIN=http://3.14.182.194,http://3.14.182.194:3001
MONGODB_URI=mongodb://localhost:27017/relatorios
JWT_SECRET=your_secure_secret_here
```

## Troubleshooting

### Backend not responding on 5001
```bash
# Check if process is running
pm2 status
pm2 logs relatorios-backend

# Check if port is in use
lsof -i :5001  # Linux/Mac
netstat -ano | findstr :5001  # Windows

# Verify environment
cat .env | grep BACKEND_PORT
```

### Frontend proxy not responding on 3001
```bash
# Check logs
pm2 logs relatorios-frontend

# Check if dist folder exists
ls -la dist/

# Rebuild frontend if needed
npm run client:build
```

### Nginx not working
```bash
# Check nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/app-relatorios.error.log

# Check if backend/frontend are running
curl http://127.0.0.1:5001/api/health
curl http://127.0.0.1:3001/api/health
```

### CORS errors
```bash
# Check environment variables
cat .env | grep -E "CLIENT_URL|CORS_ORIGIN"

# Should have both:
# CLIENT_URL=http://3.14.182.194:3001
# CORS_ORIGIN=http://3.14.182.194,http://3.14.182.194:3001

# Restart backend after changing env
pm2 restart relatorios-backend
```

### Port 80 not accessible externally
```bash
# 1. Check security group in AWS Console
# Must have: HTTP, Port 80, Source 0.0.0.0/0

# 2. Check nginx is listening
sudo netstat -tlnp | grep :80
# Should show nginx listening on 0.0.0.0:80

# 3. Check firewall (if enabled)
sudo iptables -L -n | grep 80
```

## Success Criteria

✅ All checks should pass:

1. **Backend health check works:**
   - `curl http://127.0.0.1:5001/api/health` returns 200 OK

2. **Frontend proxy works:**
   - `curl http://127.0.0.1:3001/api/health` returns 200 OK (proxied)
   - `curl http://127.0.0.1:3001/health` returns 200 OK (proxy health)

3. **Nginx works:**
   - `curl http://localhost/api/health` returns 200 OK
   - `curl http://localhost/` returns HTML content

4. **External access works:**
   - `http://3.14.182.194/` loads the SPA in browser
   - No CORS errors in browser console
   - Login and API calls work correctly

5. **PM2 shows both processes online:**
   - `pm2 status` shows relatorios-backend and relatorios-frontend as "online"

## Files Modified

- `.env.example` - Added CORS_ORIGIN documentation
- `.env.production` - Updated with proper CORS configuration
- `server.js` - Enhanced CORS handling for multiple origins
- `frontend-server.js` - Improved error handling (502 on ECONNREFUSED)
- `README.md` - Added architecture and CORS documentation
- `DEPLOY.md` - Added Nginx setup and troubleshooting

## Files Created

- `nginx/app-relatorios.conf` - Nginx configuration for port 80
- `scripts/nginx/install-config.sh` - Installation script for Nginx config

## Notes

- The Nginx configuration is designed to work alongside the existing architecture
- The frontend proxy (port 3001) still serves the SPA and proxies API calls
- Nginx (port 80) sits in front and routes traffic to the appropriate service
- CORS is configured to allow access from both port 80 and port 3001
- All changes are backward compatible - the app still works on port 3001 directly
