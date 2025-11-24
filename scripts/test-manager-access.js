#!/usr/bin/env node

/**
 * Script para validar acesso de gerente (manager) aos endpoints de relatórios
 * 
 * Este script testa:
 * 1. Autenticação como manager e acesso a /api/reports/:companyId/summary?type=purchases (esperado: 200)
 * 2. Acesso a /api/reports/xlsx-files (esperado: 200 após mudança de requireAdmin para requireAdminOrManager)
 * 3. Acesso a rota administrativa /api/admin/users (esperado: 403 - deve permanecer bloqueado)
 * 
 * Uso:
 *   node scripts/test-manager-access.js <manager-email> <manager-password> [company-id]
 * 
 * Exemplo:
 *   node scripts/test-manager-access.js gerente@example.com senha123 64a8f1234567890abcdef123
 */

const axios = require('axios');

// Configuração
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${symbol} ${name}`, color);
  if (details) {
    log(`  ${details}`, 'cyan');
  }
}

async function testManagerAccess(email, password, companyId) {
  let token = null;
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };

  try {
    // Test 1: Autenticação como manager
    log('\n=== Teste 1: Autenticação como Manager ===', 'blue');
    testResults.total++;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      if (loginResponse.data.success && loginResponse.data.token) {
        token = loginResponse.data.token;
        const user = loginResponse.data.user;
        
        if (user.role === 'manager') {
          testResults.passed++;
          logTest('Login como manager', true, `Usuário: ${user.username}, Role: ${user.role}`);
        } else {
          testResults.failed++;
          logTest('Login como manager', false, `Usuário não é gerente. Role: ${user.role}`);
          return;
        }
      } else {
        testResults.failed++;
        logTest('Login como manager', false, 'Resposta sem token');
        return;
      }
    } catch (error) {
      testResults.failed++;
      logTest('Login como manager', false, error.response?.data?.message || error.message);
      return;
    }

    // Configurar token para próximas requisições
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Test 2: Acesso a /api/reports/:companyId/summary
    log('\n=== Teste 2: Acesso a Resumo de Relatórios ===', 'blue');
    testResults.total++;
    
    // Se companyId não foi fornecido, buscar empresas do usuário
    if (!companyId) {
      try {
        const companiesResponse = await axios.get(`${API_BASE_URL}/companies?limit=1`);
        if (companiesResponse.data.success && companiesResponse.data.data?.companies?.length > 0) {
          companyId = companiesResponse.data.data.companies[0]._id;
          log(`  Usando primeira empresa vinculada: ${companyId}`, 'cyan');
        } else {
          log('  ⚠ Gerente não possui empresas vinculadas. Pulando teste de resumo.', 'yellow');
          testResults.total--; // Não contar este teste
          companyId = null;
        }
      } catch (error) {
        log('  ⚠ Erro ao buscar empresas. Pulando teste de resumo.', 'yellow');
        testResults.total--;
        companyId = null;
      }
    }

    if (companyId) {
      try {
        const summaryResponse = await axios.get(
          `${API_BASE_URL}/reports/${companyId}/summary?type=purchases`
        );

        if (summaryResponse.status === 200 && summaryResponse.data.success) {
          testResults.passed++;
          logTest('Acesso a resumo de relatórios', true, 
            `Registros: ${summaryResponse.data.data?.summary?.totalRecords || 0}`);
        } else {
          testResults.failed++;
          logTest('Acesso a resumo de relatórios', false, 'Resposta sem sucesso');
        }
      } catch (error) {
        testResults.failed++;
        logTest('Acesso a resumo de relatórios', false, 
          error.response?.data?.message || error.message);
      }
    }

    // Test 3: Acesso a /api/reports/xlsx-files
    log('\n=== Teste 3: Acesso a Lista de Arquivos Excel ===', 'blue');
    testResults.total++;
    try {
      const xlsxResponse = await axios.get(`${API_BASE_URL}/reports/xlsx-files`);

      if (xlsxResponse.status === 200 && xlsxResponse.data.success) {
        testResults.passed++;
        const files = xlsxResponse.data.data || [];
        logTest('Acesso a lista de arquivos Excel', true, 
          `Encontrados ${files.length} arquivo(s)`);
      } else {
        testResults.failed++;
        logTest('Acesso a lista de arquivos Excel', false, 'Resposta sem sucesso');
      }
    } catch (error) {
      testResults.failed++;
      logTest('Acesso a lista de arquivos Excel', false, 
        error.response?.data?.message || error.message);
    }

    // Test 4: Acesso NEGADO a rota administrativa
    log('\n=== Teste 4: Bloqueio de Rota Administrativa ===', 'blue');
    testResults.total++;
    try {
      await axios.get(`${API_BASE_URL}/admin/users`);
      // Se chegou aqui, não deveria ter acesso
      testResults.failed++;
      logTest('Bloqueio de rota administrativa', false, 
        'Manager conseguiu acessar rota administrativa (ERRO DE SEGURANÇA)');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        testResults.passed++;
        logTest('Bloqueio de rota administrativa', true, 
          'Acesso corretamente negado (403/401)');
      } else {
        testResults.failed++;
        logTest('Bloqueio de rota administrativa', false, 
          `Erro inesperado: ${error.message}`);
      }
    }

    // Test 5: Acesso a configuração de arquivos de relatório da empresa
    log('\n=== Teste 5: Acesso a Arquivos de Relatório da Empresa ===', 'blue');
    testResults.total++;
    
    if (companyId) {
      try {
        const reportFilesResponse = await axios.get(`${API_BASE_URL}/companies/${companyId}/report-files`);

        if (reportFilesResponse.status === 200 && reportFilesResponse.data.success) {
          testResults.passed++;
          logTest('Acesso a arquivos de relatório da empresa', true, 
            `Purchases: ${reportFilesResponse.data.data?.purchasesReportPath || 'não configurado'}, Sales: ${reportFilesResponse.data.data?.salesReportPath || 'não configurado'}`);
        } else {
          testResults.failed++;
          logTest('Acesso a arquivos de relatório da empresa', false, 'Resposta sem sucesso');
        }
      } catch (error) {
        testResults.failed++;
        logTest('Acesso a arquivos de relatório da empresa', false, 
          error.response?.data?.message || error.message);
      }
    } else {
      log('  ⚠ Sem empresa para testar. Pulando teste de arquivos de relatório.', 'yellow');
      testResults.total--;
    }

    // Test 6: Acesso a estatísticas de relatórios
    log('\n=== Teste 6: Acesso a Estatísticas de Relatórios ===', 'blue');
    testResults.total++;
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/reports/stats/overview`);

      if (statsResponse.status === 200 && statsResponse.data.success) {
        testResults.passed++;
        logTest('Acesso a estatísticas de relatórios', true, 
          `Total de relatórios: ${statsResponse.data.data?.overview?.total || 0}`);
      } else {
        testResults.failed++;
        logTest('Acesso a estatísticas de relatórios', false, 'Resposta sem sucesso');
      }
    } catch (error) {
      testResults.failed++;
      logTest('Acesso a estatísticas de relatórios', false, 
        error.response?.data?.message || error.message);
    }

    // Test 7: Bloqueio de alteração de arquivos de relatório (admin-only)
    log('\n=== Teste 7: Bloqueio de Alteração de Arquivos de Relatório ===', 'blue');
    testResults.total++;
    
    if (companyId) {
      try {
        await axios.put(`${API_BASE_URL}/companies/${companyId}/report-files`, {
          purchasesReportPath: 'test.xlsx'
        });
        // Se chegou aqui, não deveria ter acesso
        testResults.failed++;
        logTest('Bloqueio de alteração de arquivos', false, 
          'Manager conseguiu alterar arquivos de relatório (ERRO DE SEGURANÇA)');
      } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          testResults.passed++;
          logTest('Bloqueio de alteração de arquivos', true, 
            'Acesso corretamente negado (403/401)');
        } else {
          testResults.failed++;
          logTest('Bloqueio de alteração de arquivos', false, 
            `Erro inesperado: ${error.message}`);
        }
      }
    } else {
      log('  ⚠ Sem empresa para testar. Pulando teste de alteração de arquivos.', 'yellow');
      testResults.total--;
    }

  } catch (error) {
    log(`\nErro geral: ${error.message}`, 'red');
  }

  // Resumo dos resultados
  log('\n=== Resumo dos Testes ===', 'blue');
  log(`Total de testes: ${testResults.total}`);
  log(`Testes aprovados: ${testResults.passed}`, 'green');
  log(`Testes falhados: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  
  const successRate = testResults.total > 0 
    ? ((testResults.passed / testResults.total) * 100).toFixed(1) 
    : 0;
  log(`Taxa de sucesso: ${successRate}%`, successRate === 100 ? 'green' : 'yellow');

  // Exit code baseado nos resultados
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  log('Uso: node scripts/test-manager-access.js <manager-email> <manager-password> [company-id]', 'yellow');
  log('\nExemplo:', 'cyan');
  log('  node scripts/test-manager-access.js gerente@example.com senha123', 'cyan');
  log('  node scripts/test-manager-access.js gerente@example.com senha123 64a8f1234567890abcdef123', 'cyan');
  process.exit(1);
}

const [email, password, companyId] = args;

log('=== Teste de Acesso de Manager ===', 'blue');
log(`Email: ${email}`);
log(`API Base URL: ${API_BASE_URL}\n`);

testManagerAccess(email, password, companyId);
