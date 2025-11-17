# Architecture Change Summary

## Before (Broken Configuration)

```
┌─────────────────────────────────────────────────────────────┐
│ EC2 Instance / Server                                        │
│                                                              │
│  .env.production:                                            │
│    PORT=3001                                                 │
│                                                              │
│  ┌────────────────────┐                                     │
│  │ Frontend Proxy     │                                     │
│  │ (frontend-*.js)    │ ← Starts on PORT (3001)             │
│  │ Port: 3001         │ ← Multiple variants, confusing      │
│  │ Proxies to: 5001   │ ← Hardcoded                         │
│  └────────────────────┘                                     │
│                                                              │
│  ┌────────────────────┐                                     │
│  │ Backend API        │ ❌ NOT RUNNING!                     │
│  │ (server.js)        │ ← Tries to use PORT (3001)          │
│  │ Expected: 5001     │ ← Conflicts with frontend or fails  │
│  └────────────────────┘                                     │
│                                                              │
│  Result: Only frontend runs on 3001                         │
│          Backend fails to start                             │
│          Login gets ECONNREFUSED 127.0.0.1:5001             │
└─────────────────────────────────────────────────────────────┘

User Browser → http://server:3001/api/login
                     ↓
              Frontend Proxy :3001
                     ↓ (tries to proxy)
              Backend :5001 ❌ NOT RUNNING
                     ↓
              ECONNREFUSED Error
```

## After (Fixed Configuration)

```
┌─────────────────────────────────────────────────────────────┐
│ EC2 Instance / Server                                        │
│                                                              │
│  .env.production:                                            │
│    BACKEND_PORT=5001                                         │
│    FRONTEND_PORT=3001                                        │
│    BACKEND_HOST=127.0.0.1                                    │
│                                                              │
│  ┌────────────────────┐                                     │
│  │ Frontend Proxy     │ ✅ Running                          │
│  │ (frontend-server.js)│ ← Uses FRONTEND_PORT               │
│  │ Port: 3001         │ ← Single canonical implementation    │
│  │ Proxies to:        │ ← Uses BACKEND_HOST:BACKEND_PORT    │
│  │  ${BACKEND_URL}    │ ← Fully configurable                │
│  └────────────────────┘                                     │
│           ↓ Proxies /api/*                                   │
│  ┌────────────────────┐                                     │
│  │ Backend API        │ ✅ Running                          │
│  │ (server.js)        │ ← Uses BACKEND_PORT                 │
│  │ Port: 5001         │ ← Explicit port separation          │
│  │ Endpoints: /api/*  │ ← Health, auth, reports, etc.       │
│  └────────────────────┘                                     │
│                                                              │
│  PM2 Processes:                                              │
│    - relatorios-backend  (online, port 5001)                │
│    - relatorios-frontend (online, port 3001)                │
│                                                              │
│  Verification: npm run verify:ports                         │
│    ✅ Backend :5001 responding                              │
│    ✅ Frontend :3001 responding                             │
│    ✅ Proxy routing working                                 │
└─────────────────────────────────────────────────────────────┘

User Browser → http://server:3001/api/login
                     ↓
              Frontend Proxy :3001
                     ↓ (proxies successfully)
              Backend :5001 ✅ Running
                     ↓
              Returns 200/401 (success)
```

## Key Improvements

### 1. Clear Port Separation
**Before:**
- One `PORT` variable used by both processes → Conflict
- Backend couldn't start on intended port

**After:**
- `BACKEND_PORT=5001` for API server
- `FRONTEND_PORT=3001` for proxy server
- No conflicts, both start successfully

### 2. Configurable Proxy Target
**Before:**
```javascript
// Hardcoded
target: 'http://127.0.0.1:5001'
```

**After:**
```javascript
// Configurable from environment
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = process.env.BACKEND_PORT || 5001;
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
```

### 3. Consolidated Proxy Implementation
**Before:**
- frontend-proxy.js
- frontend-server.js
- frontend-server-fixed.js
- frontend-server-simple.js
- Confusion about which one to use

**After:**
- **frontend-server.js** (canonical implementation)
- Others marked as `.deprecated`
- Clear documentation

### 4. PM2 Ecosystem Configuration
**Before:**
```javascript
// Both processes using same PORT variable
env: { PORT: 5001 }  // or 3001? Unclear!
```

**After:**
```javascript
// Clear separation
{
  name: 'relatorios-backend',
  env: { BACKEND_PORT: 5001 }
},
{
  name: 'relatorios-frontend',
  env: { FRONTEND_PORT: 3001, BACKEND_PORT: 5001 }
}
```

### 5. Verification & Monitoring
**Before:**
- No easy way to verify both processes running
- Manual curl commands needed

**After:**
```bash
npm run verify:ports
```
Output:
```
✅ Backend API is running (port 5001)
✅ Frontend Proxy is running (port 3001)
✅ Proxy routing is working correctly
✅ ALL SYSTEMS OPERATIONAL
```

### 6. Enhanced Logging
**Before:**
```
Server running on port 5001
```

**After:**
```
============================================================
🚀 Backend API Server Started
============================================================
📡 Port: 5001
🌍 Environment: production
🔗 Health Check: http://localhost:5001/api/health
📊 Version: http://localhost:5001/api/version
🔒 CORS Origins: http://your-ip:3001
============================================================
```

## Environment Variables Comparison

### Before
```env
PORT=3001  # Ambiguous - frontend or backend?
MONGODB_URI=...
JWT_SECRET=...
```

### After
```env
# Clear separation
BACKEND_PORT=5001
BACKEND_HOST=127.0.0.1
FRONTEND_PORT=3001

# Additional clarity
CLIENT_URL=http://your-ip:3001

# Existing
MONGODB_URI=...
JWT_SECRET=...
```

## Deployment Flow Comparison

### Before
```bash
pm2 start server.js --name backend
pm2 serve dist 3000 --name frontend
# Port mismatch, unclear configuration
```

### After
```bash
pm2 start ecosystem.config.js
# Starts both processes with correct configuration
# Backend on 5001, Frontend on 3001
```

## New NPM Scripts

```json
{
  "start:api": "node server.js",           // Start backend only
  "start:web": "node frontend-server.js",  // Start frontend only
  "verify:ports": "node scripts/verify-ports.js", // Verify both running
  "pm2:start": "pm2 start ecosystem.config.js"    // Start both with PM2
}
```

## Benefits Summary

✅ **Reliability**: Both processes start consistently  
✅ **Clarity**: Clear port assignments, no confusion  
✅ **Debuggability**: Enhanced logging and verification tools  
✅ **Configurability**: All ports/hosts configurable via environment  
✅ **Maintainability**: Single canonical proxy implementation  
✅ **Documentation**: Comprehensive guides and troubleshooting  
✅ **Backward Compatible**: Fallback to PORT variable with warning  

## Migration Effort

**For existing deployments:**
1. Update .env (2 minutes)
2. Restart services (1 minute)
3. Verify (30 seconds)

**Total: < 5 minutes downtime**
