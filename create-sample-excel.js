const XLSX = require('xlsx');

const data = [
  {
    'Data Compra': '15/01/2025',
    'Fornecedor': 'Fornecedor ABC Ltda',
    'CFOP': '5102',
    'Número NFe': 'NFE001234',
    'Valor Total': '15.500,00',
    'ICMS': '2.790,00',
    'IPI': '1.550,00',
    'COFINS': '465,00',
    'Bruto': '16.000,00'
  },
  {
    'Data Compra': '20/01/2025',
    'Fornecedor': 'Fornecedor XYZ SA',
    'CFOP': '5101',
    'Número NFe': 'NFE001235',
    'Valor Total': '25.300,50',
    'ICMS': '4.554,09',
    'IPI': '2.530,05',
    'COFINS': '759,02',
    'Bruto': '26.000,00'
  },
  {
    'Data Compra': '25/01/2025',
    'Fornecedor': 'Fornecedor ABC Ltda',
    'CFOP': '5102',
    'Número NFe': 'NFE001236',
    'Valor Total': '8.750,00',
    'ICMS': '1.575,00',
    'IPI': '875,00',
    'COFINS': '262,50',
    'Bruto': '9.000,00'
  },
  {
    'Data Compra': '10/02/2025',
    'Fornecedor': 'Fornecedor DEF Comércio',
    'CFOP': '5103',
    'Número NFe': 'NFE001237',
    'Valor Total': '12.450,00',
    'ICMS': '2.241,00',
    'IPI': '1.245,00',
    'COFINS': '373,50',
    'Bruto': '12.800,00'
  },
  {
    'Data Compra': '15/02/2025',
    'Fornecedor': 'Fornecedor XYZ SA',
    'CFOP': '5101',
    'Número NFe': 'NFE001238',
    'Valor Total': '31.200,00',
    'ICMS': '5.616,00',
    'IPI': '3.120,00',
    'COFINS': '936,00',
    'Bruto': '32.000,00'
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Compras');
XLSX.writeFile(wb, '/tmp/compras-sample.xlsx');
console.log('Sample Excel file created: /tmp/compras-sample.xlsx');
