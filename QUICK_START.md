# Quick Start Guide

## Setup Instructions

### 1. Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and update with your MongoDB Atlas credentials:
```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE?retryWrites=true&w=majority
JWT_SECRET=your_secure_random_secret_key_at_least_32_characters
PORT=5000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

## Testing the API

### Using curl

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

**Register a new user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Access Protected Route:**
```bash
curl http://localhost:5000/api/protected \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Using the Test Script
```bash
# Make sure the server is running, then:
node test-api.js
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure your IP address is whitelisted in MongoDB Atlas
- Verify your username and password are correct
- Check that the database name in the connection string is correct

### Server Won't Start
- Make sure port 5000 is not already in use
- Check that all environment variables are set correctly
- Verify Node.js version (recommend Node.js 14 or higher)

### JWT Token Errors
- Ensure JWT_SECRET is set in .env
- Make sure token is sent in Authorization header as "Bearer <token>"
- Check token expiration (tokens expire after 24 hours)

## Project Structure
```
meu-app-relatorios/
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   └── auth.js              # JWT authentication
├── models/
│   └── User.js              # User schema
├── routes/
│   └── auth.js              # Auth endpoints
├── server.js                # Main application
├── package.json             # Dependencies
├── .env                     # Environment variables (create this)
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── BACKEND_README.md        # Complete API documentation
├── IMPLEMENTATION_DETAILS.md # Implementation details
└── test-api.js              # API testing script
```

## Need More Help?

- Check `BACKEND_README.md` for complete API documentation
- Check `IMPLEMENTATION_DETAILS.md` for architecture details
- Ensure MongoDB Atlas cluster is running and accessible
- Verify firewall settings allow connections to MongoDB
