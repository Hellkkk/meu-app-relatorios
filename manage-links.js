require('dotenv').config();
const User = require('./models/User');
const Company = require('./models/Company');
require('./config/database')();

async function manageUserCompanyLinks() {
  try {
    console.log('🔗 Gerenciador de Vínculos Usuário-Empresa\n');

    // Listar usuários com empresas
    console.log('📋 USUÁRIOS E SUAS EMPRESAS:');
    const users = await User.find().populate('companies', 'name cnpj');
    
    users.forEach(user => {
      console.log(`👤 ${user.username} (${user.email}) - Role: ${user.role}`);
      if (user.companies.length > 0) {
        user.companies.forEach(company => {
          console.log(`   🏢 ${company.name} (${company.cnpj})`);
        });
      } else {
        console.log('   📝 Nenhuma empresa vinculada');
      }
      console.log('');
    });

    console.log('\n📋 EMPRESAS E SEUS FUNCIONÁRIOS:');
    const companies = await Company.find().populate('employees', 'username email').populate('responsibleUser', 'username email');
    
    companies.forEach(company => {
      console.log(`🏢 ${company.name} (${company.cnpj})`);
      
      if (company.responsibleUser) {
        console.log(`   👑 Responsável: ${company.responsibleUser.username} (${company.responsibleUser.email})`);
      } else {
        console.log('   👑 Responsável: Não definido');
      }
      
      if (company.employees.length > 0) {
        company.employees.forEach(employee => {
          console.log(`   👤 ${employee.username} (${employee.email})`);
        });
      } else {
        console.log('   📝 Nenhum funcionário');
      }
      console.log('');
    });

    // Verificar inconsistências
    console.log('\n🔍 VERIFICANDO INCONSISTÊNCIAS...');
    
    let inconsistencies = 0;
    
    for (let user of users) {
      for (let companyId of user.companies) {
        const company = await Company.findById(companyId);
        if (company) {
          const isEmployee = company.employees.some(empId => empId.toString() === user._id.toString());
          const isResponsible = company.responsibleUser && company.responsibleUser.toString() === user._id.toString();
          
          if (!isEmployee && !isResponsible) {
            console.log(`❌ INCONSISTÊNCIA: ${user.username} está vinculado à empresa ${company.name}, mas não está na lista de funcionários nem é responsável`);
            inconsistencies++;
          }
        } else {
          console.log(`❌ INCONSISTÊNCIA: ${user.username} está vinculado a uma empresa que não existe (ID: ${companyId})`);
          inconsistencies++;
        }
      }
    }
    
    for (let company of companies) {
      for (let employeeId of company.employees) {
        const user = await User.findById(employeeId);
        if (user) {
          const hasCompany = user.companies.some(compId => compId.toString() === company._id.toString());
          if (!hasCompany) {
            console.log(`❌ INCONSISTÊNCIA: ${user.username} é funcionário da empresa ${company.name}, mas a empresa não está em sua lista`);
            inconsistencies++;
          }
        } else {
          console.log(`❌ INCONSISTÊNCIA: Empresa ${company.name} tem um funcionário que não existe (ID: ${employeeId})`);
          inconsistencies++;
        }
      }
      
      if (company.responsibleUser) {
        const responsible = await User.findById(company.responsibleUser);
        if (responsible) {
          const hasCompany = responsible.companies.some(compId => compId.toString() === company._id.toString());
          if (!hasCompany) {
            console.log(`❌ INCONSISTÊNCIA: ${responsible.username} é responsável pela empresa ${company.name}, mas a empresa não está em sua lista`);
            inconsistencies++;
          }
        } else {
          console.log(`❌ INCONSISTÊNCIA: Empresa ${company.name} tem um responsável que não existe (ID: ${company.responsibleUser})`);
          inconsistencies++;
        }
      }
    }
    
    if (inconsistencies === 0) {
      console.log('✅ Nenhuma inconsistência encontrada!');
    } else {
      console.log(`⚠️  ${inconsistencies} inconsistência(s) encontrada(s)`);
    }

    console.log('\n📋 COMANDOS DISPONÍVEIS PARA CORRIGIR:');
    console.log('Para remover usuário de empresa:');
    console.log('curl -X DELETE http://localhost:5001/api/admin/users/{userId}/companies/{companyId} -H "Authorization: Bearer {token}"');
    console.log('');
    console.log('Para remover funcionário de empresa:');
    console.log('curl -X DELETE http://localhost:5001/api/companies/{companyId}/employees/{userId} -H "Authorization: Bearer {token}"');
    console.log('');
    console.log('Para adicionar usuário a empresa:');
    console.log('curl -X POST http://localhost:5001/api/admin/users/{userId}/companies/{companyId} -H "Authorization: Bearer {token}"');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Função para remover vínculos (apenas para emergências)
async function cleanUserCompanyLinks() {
  try {
    console.log('🧹 LIMPEZA DE VÍNCULOS - Use com cuidado!');
    
    // Remover todas as empresas de todos os usuários
    await User.updateMany({}, { $set: { companies: [] } });
    
    // Remover todos os funcionários e responsáveis de todas as empresas
    await Company.updateMany({}, { 
      $set: { 
        employees: [],
        responsibleUser: null
      }
    });
    
    console.log('✅ Todos os vínculos foram removidos!');
    console.log('⚠️  Agora você precisará recriar os vínculos manualmente via interface ou API');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Verificar argumentos da linha de comando
const command = process.argv[2];

if (command === 'clean') {
  console.log('⚠️  ATENÇÃO: Isso removerá TODOS os vínculos entre usuários e empresas!');
  console.log('Digite "confirmar" para continuar:');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('', (answer) => {
    if (answer === 'confirmar') {
      cleanUserCompanyLinks();
    } else {
      console.log('Operação cancelada');
      process.exit(0);
    }
    rl.close();
  });
} else {
  manageUserCompanyLinks();
}