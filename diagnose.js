const axios = require('axios');

async function testSpecific() {
  console.log('🔍 Teste específico de problemas...\n');

  // Teste 1: Verificar se o backend tem a rota de login
  try {
    console.log('1️⃣ Testando se existe a rota /api/auth/login...');
    const response = await axios.get('http://localhost:5001/api/auth/login');
    console.log('   Resposta inesperada (deveria ser POST):', response.status);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('   ❌ Rota /api/auth/login NÃO EXISTE');
    } else if (error.response?.status === 405) {
      console.log('   ✅ Rota existe mas método incorreto (esperado)');
    } else {
      console.log('   🤔 Erro inesperado:', error.message);
    }
  }

  // Teste 2: Listar todas as rotas disponíveis
  try {
    console.log('\n2️⃣ Testando rotas disponíveis...');
    await axios.get('http://localhost:5001/api/users');
  } catch (error) {
    console.log('   /api/users:', error.response?.status || error.message);
  }

  try {
    await axios.get('http://localhost:5001/api/companies');
  } catch (error) {
    console.log('   /api/companies:', error.response?.status || error.message);
  }

  try {
    await axios.get('http://localhost:5001/api/reports');
  } catch (error) {
    console.log('   /api/reports:', error.response?.status || error.message);
  }

  // Teste 3: Verificar se o frontend-server.js existe
  console.log('\n3️⃣ Verificando arquivos...');
  const fs = require('fs');
  
  console.log('   frontend-server.js:', fs.existsSync('./frontend-server.js') ? '✅ Existe' : '❌ Não existe');
  console.log('   dist/index.html:', fs.existsSync('./dist/index.html') ? '✅ Existe' : '❌ Não existe');
  console.log('   ecosystem.config.js:', fs.existsSync('./ecosystem.config.js') ? '✅ Existe' : '❌ Não existe');

  // Teste 4: Verificar portas em uso
  console.log('\n4️⃣ Teste de conectividade de portas...');
  
  const net = require('net');
  
  function checkPort(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(false)); // Porta disponível
      });
      server.on('error', () => resolve(true)); // Porta em uso
    });
  }

  const port5001InUse = await checkPort(5001);
  const port3001InUse = await checkPort(3001);
  
  console.log(`   Porta 5001: ${port5001InUse ? '✅ Em uso' : '❌ Disponível'}`);
  console.log(`   Porta 3001: ${port3001InUse ? '✅ Em uso' : '❌ Disponível'}`);

  console.log('\n✨ Diagnóstico concluído!');
}

testSpecific();