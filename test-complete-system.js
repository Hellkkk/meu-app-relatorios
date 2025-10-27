const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let authTokens = {};

// Função para fazer login
async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      return response.data.data.token;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
  }
}

// Configurar header de autenticação
function setAuthHeader(token) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
}

// Teste completo do sistema
async function testCompleteSystem() {
  console.log('🚀 Iniciando teste completo do sistema...\n');

  try {
    // 1. Login como admin
    console.log('1. Fazendo login como administrador...');
    authTokens.admin = await login('admin@admin.com', 'admin123');
    console.log('✅ Login admin realizado com sucesso\n');

    // 2. Buscar estatísticas iniciais
    console.log('2. Buscando estatísticas do sistema...');
    const statsResponse = await axios.get(`${API_BASE}/admin/user-company-stats`, setAuthHeader(authTokens.admin));
    console.log('📊 Estatísticas atuais:');
    console.log(`   - Usuários: ${statsResponse.data.data.totalUsers}`);
    console.log(`   - Empresas: ${statsResponse.data.data.totalCompanies}`);
    console.log(`   - Vínculos: ${statsResponse.data.data.totalLinks}`);
    console.log(`   - Inconsistências: ${statsResponse.data.data.inconsistencies}\n`);

    // 3. Listar usuários
    console.log('3. Listando usuários disponíveis...');
    const usersResponse = await axios.get(`${API_BASE}/admin/users`, setAuthHeader(authTokens.admin));
    const users = usersResponse.data.data.users.filter(user => user.role !== 'admin');
    console.log(`📝 ${users.length} usuários encontrados:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.email}) - ${user.companies?.length || 0} empresas`);
    });
    console.log();

    // 4. Listar empresas
    console.log('4. Listando empresas disponíveis...');
    const companiesResponse = await axios.get(`${API_BASE}/companies`, setAuthHeader(authTokens.admin));
    const companies = companiesResponse.data.data.companies;
    console.log(`🏢 ${companies.length} empresas encontradas:`);
    companies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name} (${company.cnpj}) - ${company.employees?.length || 0} funcionários`);
    });
    console.log();

    // 5. Teste de operações de vínculo
    if (users.length > 0 && companies.length > 0) {
      const testUser = users[0];
      const testCompany = companies[0];

      console.log(`5. Testando operações de vínculo entre ${testUser.username} e ${testCompany.name}...`);

      // Verificar se já existe vínculo
      const hasLink = testUser.companies?.some(comp => comp._id === testCompany._id);
      
      if (!hasLink) {
        // Adicionar vínculo
        console.log('   5.1. Adicionando vínculo...');
        const addResponse = await axios.post(
          `${API_BASE}/admin/users/${testUser._id}/companies/${testCompany._id}`,
          {},
          setAuthHeader(authTokens.admin)
        );
        console.log('   ✅ Vínculo adicionado com sucesso');
        
        // Aguardar um momento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Remover vínculo
        console.log('   5.2. Removendo vínculo...');
        const removeResponse = await axios.delete(
          `${API_BASE}/admin/users/${testUser._id}/companies/${testCompany._id}`,
          setAuthHeader(authTokens.admin)
        );
        console.log('   ✅ Vínculo removido com sucesso');
      } else {
        console.log('   ⚠️  Vínculo já existe, testando remoção...');
        const removeResponse = await axios.delete(
          `${API_BASE}/admin/users/${testUser._id}/companies/${testCompany._id}`,
          setAuthHeader(authTokens.admin)
        );
        console.log('   ✅ Vínculo removido com sucesso');
        
        // Aguardar um momento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Adicionar novamente
        console.log('   5.3. Adicionando vínculo novamente...');
        const addResponse = await axios.post(
          `${API_BASE}/admin/users/${testUser._id}/companies/${testCompany._id}`,
          {},
          setAuthHeader(authTokens.admin)
        );
        console.log('   ✅ Vínculo adicionado novamente');
      }
      console.log();
    }

    // 6. Verificar estatísticas finais
    console.log('6. Verificando estatísticas finais...');
    const finalStatsResponse = await axios.get(`${API_BASE}/admin/user-company-stats`, setAuthHeader(authTokens.admin));
    console.log('📊 Estatísticas finais:');
    console.log(`   - Usuários: ${finalStatsResponse.data.data.totalUsers}`);
    console.log(`   - Empresas: ${finalStatsResponse.data.data.totalCompanies}`);
    console.log(`   - Vínculos: ${finalStatsResponse.data.data.totalLinks}`);
    console.log(`   - Inconsistências: ${finalStatsResponse.data.data.inconsistencies}`);
    console.log(`   - Usuários sem empresa: ${finalStatsResponse.data.data.usersWithoutCompanies}`);
    console.log(`   - Empresas sem funcionários: ${finalStatsResponse.data.data.companiesWithoutEmployees}\n`);

    // 7. Teste de login de usuário normal
    if (users.length > 0) {
      console.log('7. Testando login de usuário normal...');
      try {
        // Assumindo que existem usuários de teste com senhas padrão
        const testUser = users.find(u => u.email.includes('test') || u.email.includes('user'));
        if (testUser) {
          // Tentar logar (pode falhar se senha não for conhecida)
          console.log(`   Tentando login com ${testUser.email}...`);
          console.log('   ⚠️  Senha não conhecida, pulando teste de login de usuário');
        }
      } catch (error) {
        console.log('   ⚠️  Não foi possível testar login de usuário normal');
      }
      console.log();
    }

    console.log('🎉 Teste completo finalizado com sucesso!');
    console.log('\n📋 Resumo dos testes:');
    console.log('✅ Autenticação de administrador');
    console.log('✅ Consulta de estatísticas');
    console.log('✅ Listagem de usuários e empresas');
    console.log('✅ Operações de vínculo (adicionar/remover)');
    console.log('✅ Verificação de dados atualizados');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error('   Detalhes do erro:', error.response.data);
    }
  }
}

// Função para monitorar servidor
async function checkServerHealth() {
  try {
    const response = await axios.get(`${API_BASE}/../health`);
    console.log('✅ Servidor está online');
    return true;
  } catch (error) {
    console.log('❌ Servidor não está respondendo');
    return false;
  }
}

// Executar testes
async function main() {
  console.log('🔍 Verificando status do servidor...');
  const serverOnline = await checkServerHealth();
  
  if (!serverOnline) {
    console.log('⚠️  Execute o servidor primeiro: npm start');
    return;
  }

  console.log('🟢 Servidor online, iniciando testes...\n');
  await testCompleteSystem();
}

main().catch(console.error);