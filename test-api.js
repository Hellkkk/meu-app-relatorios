#!/usr/bin/env node
/**
 * Simple test script to verify the backend API
 * This script tests the /register and /login endpoints
 */

const http = require('http');

const PORT = process.env.PORT || 5001;
const HOST = 'localhost';

// Helper function to make HTTP requests
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test health endpoint
async function testHealth() {
  console.log('\n=== Testing Health Endpoint ===');
  try {
    const response = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/health',
      method: 'GET'
    });
    
    console.log('Status:', response.statusCode);
    console.log('Response:', response.body);
    return response.statusCode === 200;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

// Test register endpoint
async function testRegister() {
  console.log('\n=== Testing Register Endpoint ===');
  const testUser = {
    username: 'testuser' + Date.now(),
    email: `testuser${Date.now()}@example.com`,
    password: 'password123'
  };
  
  try {
    const response = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, testUser);
    
    console.log('Status:', response.statusCode);
    console.log('Response:', response.body);
    
    if (response.body.token) {
      console.log('✓ Token received');
      return { success: true, token: response.body.token, user: testUser };
    }
    return { success: false };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false };
  }
}

// Test login endpoint
async function testLogin(credentials) {
  console.log('\n=== Testing Login Endpoint ===');
  
  try {
    const response = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: credentials.email,
      password: credentials.password
    });
    
    console.log('Status:', response.statusCode);
    console.log('Response:', response.body);
    
    if (response.body.token) {
      console.log('✓ Token received');
      return { success: true, token: response.body.token };
    }
    return { success: false };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false };
  }
}

// Test protected endpoint
async function testProtectedRoute(token) {
  console.log('\n=== Testing Protected Endpoint ===');
  
  try {
    const response = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/protected',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Status:', response.statusCode);
    console.log('Response:', response.body);
    return response.statusCode === 200;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Backend API Tests...');
  console.log(`Testing server at http://${HOST}:${PORT}`);
  
  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const healthCheck = await testHealth();
  if (!healthCheck) {
    console.error('\n❌ Health check failed. Server may not be running.');
    return;
  }
  
  const registerResult = await testRegister();
  if (!registerResult.success) {
    console.error('\n❌ Register test failed');
    return;
  }
  
  const loginResult = await testLogin(registerResult.user);
  if (!loginResult.success) {
    console.error('\n❌ Login test failed');
    return;
  }
  
  const protectedResult = await testProtectedRoute(loginResult.token);
  if (!protectedResult) {
    console.error('\n❌ Protected route test failed');
    return;
  }
  
  console.log('\n✓ All tests passed!');
}

// Run tests
runTests().catch(console.error);
