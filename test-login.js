const axios = require('axios');

// Teste direto do backend
async function testBackendDirect() {
  try {
    console.log('🔍 Testando backend diretamente...');
    const response = await axios.get('http://localhost:5001/api/health');
    console.log('✅ Backend Health:', response.data);
  } catch (error) {
    console.error('❌ Erro no backend:', error.message);
  }
}

// Teste do proxy frontend
async function testFrontendProxy() {
  try {
    console.log('🔍 Testando proxy do frontend...');
    const response = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Frontend Proxy Health:', response.data);
  } catch (error) {
    console.error('❌ Erro no proxy frontend:', error.message);
  }
}

// Teste de login direto
async function testLoginDirect() {
  try {
    console.log('🔍 Testando login direto no backend...');
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@teste.com',
      password: 'admin123'
    });
    console.log('✅ Login direto bem-sucedido:', response.data);
  } catch (error) {
    console.error('❌ Erro no login direto:', error.response?.data || error.message);
  }
}

// Teste de login via proxy
async function testLoginProxy() {
  try {
    console.log('🔍 Testando login via proxy...');
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@teste.com',
      password: 'admin123'
    });
    console.log('✅ Login via proxy bem-sucedido:', response.data);
  } catch (error) {
    console.error('❌ Erro no login via proxy:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🧪 Iniciando testes de conectividade...\n');
  
  await testBackendDirect();
  console.log('');
  
  await testFrontendProxy();
  console.log('');
  
  await testLoginDirect();
  console.log('');
  
  await testLoginProxy();
  console.log('\n✨ Testes concluídos!');
}

runTests();