#!/usr/bin/env node

/**
 * Local test to demonstrate the canonized parser output
 * This simulates what the API endpoint would return
 */

const { parseExcelFile } = require('../utils/excelParser');
const path = require('path');

console.log('========================================');
console.log('Excel Parser Canonization Demo');
console.log('========================================\n');

// Parse Vendas
console.log('📊 Parsing Vendas_AVM.xlsx...');
const vendasFile = path.join(__dirname, '..', 'Vendas_AVM.xlsx');
const vendas = parseExcelFile(vendasFile, 'sales');

console.log(`✅ Parsed ${vendas.length} sales records\n`);
console.log('First 3 Vendas Records:');
console.log('─'.repeat(80));

vendas.slice(0, 3).forEach((record, index) => {
  console.log(`\nRecord ${index + 1}:`);
  console.log(`  Cliente: ${record.cliente}`);
  console.log(`  Data Emissão: ${record.data_emissao}`);
  console.log(`  Nº NFe: ${record.numero_nfe}`);
  console.log(`  CFOP: ${record.cfop}`);
  console.log(`  Valor Total: R$ ${record.valor_total.toFixed(2)}`);
  console.log(`  ICMS: R$ ${record.icms.toFixed(2)}`);
  console.log(`  IPI: R$ ${record.ipi.toFixed(2)}`);
  console.log(`  PIS: R$ ${record.pis.toFixed(2)}`);
  console.log(`  COFINS: R$ ${record.cofins.toFixed(2)}`);
});

// Parse Compras
console.log('\n\n📊 Parsing Compras_AVM.xlsx...');
const comprasFile = path.join(__dirname, '..', 'Compras_AVM.xlsx');
const compras = parseExcelFile(comprasFile, 'purchases');

console.log(`✅ Parsed ${compras.length} purchase records\n`);
console.log('First 3 Compras Records:');
console.log('─'.repeat(80));

compras.slice(0, 3).forEach((record, index) => {
  console.log(`\nRecord ${index + 1}:`);
  console.log(`  Fornecedor: ${record.fornecedor}`);
  console.log(`  Data Compra: ${record.data_compra}`);
  console.log(`  Nº NFe: ${record.numero_nfe}`);
  console.log(`  CFOP: ${record.cfop}`);
  console.log(`  Valor Total: R$ ${record.valor_total.toFixed(2)}`);
  console.log(`  ICMS: R$ ${record.icms.toFixed(2)}`);
  console.log(`  IPI: R$ ${record.ipi.toFixed(2)}`);
  console.log(`  PIS: R$ ${record.pis.toFixed(2)}`);
  console.log(`  COFINS: R$ ${record.cofins.toFixed(2)}`);
});

// Calculate totals
console.log('\n\n📈 Summary Statistics:');
console.log('─'.repeat(80));

const vendasTotals = {
  count: vendas.length,
  valor_total: vendas.reduce((sum, r) => sum + r.valor_total, 0),
  icms: vendas.reduce((sum, r) => sum + r.icms, 0),
  ipi: vendas.reduce((sum, r) => sum + r.ipi, 0),
  pis: vendas.reduce((sum, r) => sum + r.pis, 0),
  cofins: vendas.reduce((sum, r) => sum + r.cofins, 0)
};

const comprasTotals = {
  count: compras.length,
  valor_total: compras.reduce((sum, r) => sum + r.valor_total, 0),
  icms: compras.reduce((sum, r) => sum + r.icms, 0),
  ipi: compras.reduce((sum, r) => sum + r.ipi, 0),
  pis: compras.reduce((sum, r) => sum + r.pis, 0),
  cofins: compras.reduce((sum, r) => sum + r.cofins, 0)
};

console.log('\nVendas Totals:');
console.log(`  Records: ${vendasTotals.count}`);
console.log(`  Valor Total: R$ ${vendasTotals.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`  ICMS: R$ ${vendasTotals.icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`  IPI: R$ ${vendasTotals.ipi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`  PIS: R$ ${vendasTotals.pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`  COFINS: R$ ${vendasTotals.cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

console.log('\nCompras Totals:');
console.log(`  Records: ${comprasTotals.count}`);
console.log(`  Valor Total: R$ ${comprasTotals.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`  ICMS: R$ ${comprasTotals.icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`  IPI: R$ ${comprasTotals.ipi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`  PIS: R$ ${comprasTotals.pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`  COFINS: R$ ${comprasTotals.cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

// Validation
console.log('\n\n✅ Validation:');
console.log('─'.repeat(80));

const validations = [
  {
    name: 'All vendas have cliente field',
    pass: vendas.every(r => r.cliente !== undefined && r.cliente !== '')
  },
  {
    name: 'All vendas have data_emissao field',
    pass: vendas.every(r => r.data_emissao !== undefined)
  },
  {
    name: 'All vendas have pis at root level',
    pass: vendas.every(r => r.pis !== undefined)
  },
  {
    name: 'No vendas have pis in outras_info',
    pass: !vendas.some(r => r.outras_info && r.outras_info.pis !== undefined)
  },
  {
    name: 'All compras have fornecedor field',
    pass: compras.every(r => r.fornecedor !== undefined && r.fornecedor !== '')
  },
  {
    name: 'All compras have data_compra field',
    pass: compras.every(r => r.data_compra !== undefined)
  },
  {
    name: 'All compras have pis at root level',
    pass: compras.every(r => r.pis !== undefined)
  },
  {
    name: 'No compras have pis in outras_info',
    pass: !compras.some(r => r.outras_info && r.outras_info.pis !== undefined)
  },
  {
    name: 'Total PIS from vendas > 0',
    pass: vendasTotals.pis > 0
  },
  {
    name: 'Total valor_total from vendas > 0',
    pass: vendasTotals.valor_total > 0
  }
];

validations.forEach(v => {
  console.log(`${v.pass ? '✅' : '❌'} ${v.name}`);
});

const allPassed = validations.every(v => v.pass);
console.log(`\n${allPassed ? '✅ All validations passed!' : '❌ Some validations failed!'}`);

console.log('\n========================================\n');

process.exit(allPassed ? 0 : 1);
