require('dotenv').config();
const axios = require('axios');

// Configuração
const API_BASE = 'http://localhost:5001/api';
let authToken = '';

async function login() {
  try {
    console.log('🔐 Fazendo login como admin...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@teste.com',
      password: 'admin123'
    });
    
    if (response.data.success) {
      authToken = response.data.token;
      console.log('✅ Login realizado com sucesso');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getUsers() {
  try {
    const response = await axios.get(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data.data.users;
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error.response?.data?.message || error.message);
    return [];
  }
}

async function getCompanies() {
  try {
    const response = await axios.get(`${API_BASE}/companies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data.data.companies;
  } catch (error) {
    console.error('❌ Erro ao buscar empresas:', error.response?.data?.message || error.message);
    return [];
  }
}

async function removeUserFromCompany(userId, companyId) {
  try {
    console.log(`🔄 Removendo usuário ${userId} da empresa ${companyId}...`);
    const response = await axios.delete(`${API_BASE}/admin/users/${userId}/companies/${companyId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Usuário removido da empresa com sucesso');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao remover usuário da empresa:', error.response?.data?.message || error.message);
    return false;
  }
}

async function removeEmployeeFromCompany(companyId, userId) {
  try {
    console.log(`🔄 Removendo funcionário ${userId} da empresa ${companyId}...`);
    const response = await axios.delete(`${API_BASE}/companies/${companyId}/employees/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Funcionário removido da empresa com sucesso');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao remover funcionário da empresa:', error.response?.data?.message || error.message);
    return false;
  }
}

async function addUserToCompany(userId, companyId) {
  try {
    console.log(`🔄 Adicionando usuário ${userId} à empresa ${companyId}...`);
    const response = await axios.post(`${API_BASE}/admin/users/${userId}/companies/${companyId}`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Usuário adicionado à empresa com sucesso');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao adicionar usuário à empresa:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testLinkManagement() {
  console.log('🧪 Testando Gerenciamento de Vínculos Usuário-Empresa\n');
  
  // Fazer login
  const loginSuccess = await login();
  if (!loginSuccess) return;
  
  // Buscar usuários e empresas
  console.log('\n📋 Buscando usuários e empresas...');
  const users = await getUsers();
  const companies = await getCompanies();
  
  if (users.length === 0) {
    console.log('❌ Nenhum usuário encontrado');
    return;
  }
  
  if (companies.length === 0) {
    console.log('❌ Nenhuma empresa encontrada');
    return;
  }
  
  console.log(`✅ Encontrados ${users.length} usuários e ${companies.length} empresas`);
  
  // Mostrar usuários não-admin
  const nonAdminUsers = users.filter(user => user.role !== 'admin');
  console.log('\n👥 Usuários disponíveis (não-admin):');
  nonAdminUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} (${user.email}) - Empresas: ${user.companies?.length || 0}`);
  });
  
  console.log('\n🏢 Empresas disponíveis:');
  companies.forEach((company, index) => {
    console.log(`${index + 1}. ${company.name} (${company.cnpj}) - Funcionários: ${company.employees?.length || 0}`);
  });
  
  if (nonAdminUsers.length > 0 && companies.length > 0) {
    const testUser = nonAdminUsers[0];
    const testCompany = companies[0];
    
    console.log(`\n🧪 Testando com usuário: ${testUser.username} e empresa: ${testCompany.name}`);
    
    // Testar adição
    console.log('\n1️⃣ Testando adição de usuário à empresa...');
    await addUserToCompany(testUser._id, testCompany._id);
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Testar remoção via rota de usuário
    console.log('\n2️⃣ Testando remoção via rota de usuário...');
    await removeUserFromCompany(testUser._id, testCompany._id);
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Adicionar novamente
    console.log('\n3️⃣ Adicionando novamente para testar remoção via empresa...');
    await addUserToCompany(testUser._id, testCompany._id);
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Testar remoção via rota de empresa
    console.log('\n4️⃣ Testando remoção via rota de empresa...');
    await removeEmployeeFromCompany(testCompany._id, testUser._id);
  }
  
  console.log('\n✅ Testes concluídos!');
  console.log('\n📋 Para usar as APIs manualmente:');
  console.log(`🔑 Token: ${authToken}`);
  console.log('\n📝 Exemplos de uso:');
  console.log('# Remover usuário de empresa:');
  console.log(`curl -X DELETE "${API_BASE}/admin/users/{userId}/companies/{companyId}" -H "Authorization: Bearer ${authToken}"`);
  console.log('\n# Remover funcionário de empresa:');
  console.log(`curl -X DELETE "${API_BASE}/companies/{companyId}/employees/{userId}" -H "Authorization: Bearer ${authToken}"`);
  console.log('\n# Adicionar usuário a empresa:');
  console.log(`curl -X POST "${API_BASE}/admin/users/{userId}/companies/{companyId}" -H "Authorization: Bearer ${authToken}"`);
}

// Executar testes
testLinkManagement().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro geral:', error.message);
  process.exit(1);
});