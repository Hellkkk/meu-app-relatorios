# Manual Testing Instructions

## Backend Testing

### Prerequisites
1. MongoDB must be running and configured in `.env`
2. Server must be started with `npm start`

### Testing Upload Endpoint

Create a test Excel file with the following columns:
- fornecedor (or supplier)
- cfop
- numero_nfe (or nfe)
- data_compra (or data) - format: dd/mm/yyyy or Excel date
- valor_total (or total or valor) - format: 1.234,56 (PT-BR)
- icms
- ipi
- cofins
- bruto (or valor_bruto)

#### Test Upload (Replace mode)
```bash
curl -i -X POST http://localhost:5001/api/purchases/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/compras.xlsx" \
  -F "mode=replace" \
  -F "source=Compras-2025-10"
```

Expected response:
```json
{
  "success": true,
  "imported": 10,
  "mode": "replace",
  "source": "Compras-2025-10"
}
```

#### Test Upload (Append mode)
```bash
curl -i -X POST http://localhost:5001/api/purchases/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/compras.xlsx" \
  -F "mode=append" \
  -F "source=Compras-2025-11"
```

### Testing Report Endpoints

#### Get Summary
```bash
curl -i http://localhost:5001/api/purchase-reports/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "totalCompras": 100,
    "valorTotal": 150000.50,
    "totalICMS": 15000.00,
    "totalIPI": 5000.00,
    "totalCOFINS": 3000.00
  }
}
```

#### Get Top Suppliers
```bash
curl -i http://localhost:5001/api/purchase-reports/by-supplier?limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get by CFOP
```bash
curl -i http://localhost:5001/api/purchase-reports/by-cfop \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Monthly Data
```bash
curl -i http://localhost:5001/api/purchase-reports/monthly \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Taxes Breakdown
```bash
curl -i http://localhost:5001/api/purchase-reports/taxes-breakdown \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### List Purchases (with pagination)
```bash
curl -i "http://localhost:5001/api/purchases?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Search Purchases
```bash
curl -i "http://localhost:5001/api/purchases?page=1&limit=10&q=fornecedor" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Testing

### Prerequisites
1. Frontend must be built with `npm run client:build`
2. Frontend server must be running

### Manual Testing Steps

1. Navigate to http://localhost:3001/reports
2. You should see:
   - Upload panel at the top
   - Summary cards showing totals
   - Three charts (Bar, Pie, Line)
   - Data table at the bottom

3. Test Upload:
   - Drag and drop an Excel file or click to select
   - Choose mode (Append/Replace)
   - Enter a source label
   - Click "Importar Arquivo"
   - Progress bar should appear
   - Success message should display
   - Dashboard should refresh with new data

4. Test Table:
   - Use search field to filter data
   - Test pagination controls
   - Verify data displays correctly

5. Test Charts:
   - Verify bar chart shows top suppliers
   - Verify pie chart shows tax breakdown
   - Verify line chart shows monthly trend

## Sample Excel File Structure

| fornecedor | cfop | numero_nfe | data_compra | valor_total | icms | ipi | cofins | bruto |
|------------|------|------------|-------------|-------------|------|-----|--------|-------|
| Fornecedor A | 5102 | 12345 | 01/10/2025 | 1.500,00 | 180,00 | 50,00 | 30,00 | 1.760,00 |
| Fornecedor B | 5102 | 12346 | 02/10/2025 | 2.000,00 | 240,00 | 60,00 | 40,00 | 2.340,00 |

## Getting a JWT Token

If you need to authenticate:
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

The response will include a `token` field which you can use in the Authorization header.
