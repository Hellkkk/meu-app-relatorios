# Deprecated Frontend Proxy Files

The following files have been deprecated and renamed with `.deprecated` extension:

- `frontend-server-fixed.js.deprecated`
- `frontend-server-simple.js.deprecated`
- `frontend-proxy.js.deprecated`

## Reason for Deprecation

Multiple frontend proxy server implementations created confusion during deployment and maintenance. 
They all provided similar functionality but with slight variations, making it unclear which one to use.

## Active Implementation

**Use `frontend-server.js` instead** - This is the canonical, actively maintained frontend proxy server.

Key features of the active implementation:
- Configurable via environment variables (BACKEND_PORT, BACKEND_HOST, FRONTEND_PORT)
- Clear logging and error messages
- Proper fallback handling
- Integration with PM2 ecosystem

## Migration

If you were using any of the deprecated files, update your scripts/configuration to use `frontend-server.js`:

```bash
# Old
node frontend-proxy.js

# New
node frontend-server.js
```

Or use the npm scripts:
```bash
npm run start:web
```

## Environment Variables

The active implementation uses these environment variables:
- `FRONTEND_PORT` (default: 3001) - Port for frontend server
- `BACKEND_PORT` (default: 5001) - Backend API port to proxy to
- `BACKEND_HOST` (default: 127.0.0.1) - Backend API host

See `.env.example` for configuration details.
