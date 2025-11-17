#!/usr/bin/env node

/**
 * Port Verification Script
 * Checks if both backend API and frontend proxy servers are running and responding
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const BACKEND_PORT = process.env.BACKEND_PORT || 5001;
const FRONTEND_PORT = process.env.FRONTEND_PORT || process.env.PORT || 3001;

function checkEndpoint(host, port, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function verifyPorts() {
  console.log('='.repeat(70));
  console.log('🔍 Port Verification - Checking Server Health');
  console.log('='.repeat(70));
  console.log('');

  // Check backend API
  console.log(`📡 Checking Backend API on port ${BACKEND_PORT}...`);
  const backendResult = await checkEndpoint('127.0.0.1', BACKEND_PORT, '/api/health');
  
  if (backendResult.success) {
    console.log(`✅ Backend API is running (status: ${backendResult.statusCode})`);
    try {
      const data = JSON.parse(backendResult.data);
      console.log(`   Message: ${data.message}`);
      console.log(`   Port: ${data.port || BACKEND_PORT}`);
    } catch (e) {
      console.log(`   Response: ${backendResult.data}`);
    }
  } else {
    console.log(`❌ Backend API is NOT responding`);
    console.log(`   Error: ${backendResult.error}`);
    console.log(`   Hint: Make sure the backend server is running with 'npm run start:api'`);
  }
  
  console.log('');

  // Check frontend proxy
  console.log(`📡 Checking Frontend Proxy on port ${FRONTEND_PORT}...`);
  const frontendResult = await checkEndpoint('127.0.0.1', FRONTEND_PORT, '/health');
  
  if (frontendResult.success) {
    console.log(`✅ Frontend Proxy is running (status: ${frontendResult.statusCode})`);
    try {
      const data = JSON.parse(frontendResult.data);
      console.log(`   Message: ${data.message}`);
    } catch (e) {
      console.log(`   Response: ${frontendResult.data}`);
    }
  } else {
    console.log(`❌ Frontend Proxy is NOT responding`);
    console.log(`   Error: ${frontendResult.error}`);
    console.log(`   Hint: Make sure the frontend server is running with 'npm run start:web'`);
  }

  console.log('');

  // Check frontend proxy -> backend API
  console.log(`🔗 Checking Frontend Proxy -> Backend API routing...`);
  const proxyResult = await checkEndpoint('127.0.0.1', FRONTEND_PORT, '/api/health');
  
  if (proxyResult.success && proxyResult.statusCode === 200) {
    console.log(`✅ Proxy routing is working correctly`);
    console.log(`   Frontend successfully proxies API requests to backend`);
  } else if (proxyResult.success) {
    console.log(`⚠️  Proxy responded but with status: ${proxyResult.statusCode}`);
    console.log(`   Response: ${proxyResult.data}`);
  } else {
    console.log(`❌ Proxy routing FAILED`);
    console.log(`   Error: ${proxyResult.error}`);
    console.log(`   This usually means the backend is not running or not accessible`);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('Summary:');
  console.log('='.repeat(70));
  
  const allHealthy = backendResult.success && frontendResult.success && proxyResult.success;
  
  if (allHealthy) {
    console.log('✅ ALL SYSTEMS OPERATIONAL');
    console.log('   Both servers are running and communicating correctly');
    console.log(`   Frontend: http://localhost:${FRONTEND_PORT}`);
    console.log(`   Backend: http://localhost:${BACKEND_PORT}`);
    process.exit(0);
  } else {
    console.log('❌ SOME SYSTEMS ARE DOWN');
    console.log('');
    console.log('Troubleshooting steps:');
    if (!backendResult.success) {
      console.log('1. Start backend: npm run start:api');
    }
    if (!frontendResult.success) {
      console.log('2. Start frontend: npm run start:web');
    }
    console.log('3. Check logs for errors');
    console.log('4. Verify environment variables in .env file');
    console.log('5. Ensure no port conflicts (check with: lsof -i :5001 -i :3001)');
    process.exit(1);
  }
}

// Run verification
verifyPorts().catch((err) => {
  console.error('❌ Verification script error:', err);
  process.exit(1);
});
