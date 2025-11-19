# API Documentation - Excel Data Persistence

## Overview

This implementation adds MongoDB persistence for Excel data (Purchases and Sales) with proper canonization of all fields, pagination, search, and efficient aggregations.

## New MongoDB Models

### PurchaseRecord
Collection: `purchase_records`

Fields:
- `companyId` (ObjectId) - Reference to Company
- `tipo` (String) - Always "purchases"
- `fornecedor` (String) - Supplier name
- `data_compra` (Date) - Purchase date
- `numero_nfe` (String) - Invoice number
- `cfop` (String) - CFOP code
- `valor_total` (Number) - Total value
- `icms` (Number) - ICMS tax
- `ipi` (Number) - IPI tax
- `pis` (Number) - PIS tax
- `cofins` (Number) - COFINS tax
- `bruto` (Number) - Gross value
- `originalRow` (Mixed) - Optional: original Excel row for auditing

Indices:
- `{ companyId: 1, numero_nfe: 1 }` - Compound index for uniqueness
- `{ companyId: 1, fornecedor: 1 }` - For supplier search
- `{ companyId: 1, cfop: 1 }` - For CFOP filtering
- `{ companyId: 1, data_compra: -1 }` - For date sorting

### SalesRecord
Collection: `sales_records`

Fields:
- `companyId` (ObjectId) - Reference to Company
- `tipo` (String) - Always "sales"
- `cliente` (String) - Customer name
- `data_emissao` (Date) - Issue date
- `numero_nfe` (String) - Invoice number
- `cfop` (String) - CFOP code
- `valor_total` (Number) - Total value
- `icms` (Number) - ICMS tax
- `ipi` (Number) - IPI tax
- `pis` (Number) - PIS tax
- `cofins` (Number) - COFINS tax
- `bruto` (Number) - Gross value
- `originalRow` (Mixed) - Optional: original Excel row for auditing

Indices:
- `{ companyId: 1, numero_nfe: 1 }` - Compound index for uniqueness
- `{ companyId: 1, cliente: 1 }` - For customer search
- `{ companyId: 1, cfop: 1 }` - For CFOP filtering
- `{ companyId: 1, data_emissao: -1 }` - For date sorting

## API Endpoints

### 1. POST /api/reports/:companyId/sync

Manually trigger synchronization of Excel data to database.

**Parameters:**
- `companyId` (path) - Company ID
- `type` (query) - "purchases" or "sales"

**Access:** Private (Admin/Manager only)

**Rate Limiting:** 5-minute cooldown between syncs for the same company+type

**Example:**
```bash
curl -X POST "http://localhost:5001/api/reports/673cdd0f8a3b2c3d4e5f6789/sync?type=purchases" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced 404 purchases records",
  "data": {
    "success": true,
    "inserted": 404,
    "stats": {
      "totalValue": 2578714.28,
      "totalICMS": 90957.00,
      "totalIPI": 5283.71,
      "totalPIS": 5484.08,
      "totalCOFINS": 25265.21,
      "count": 404
    },
    "lastSyncAt": "2025-11-19T20:00:00.000Z"
  }
}
```

### 2. GET /api/reports/:companyId/records

Get paginated records from database with optional search.

**Parameters:**
- `companyId` (path) - Company ID
- `type` (query) - "purchases" or "sales" (required)
- `page` (query) - Page number (default: 0)
- `pageSize` (query) - Items per page (default: 10)
- `search` (query) - Search term (optional) - searches in supplier/customer, numero_nfe, cfop

**Access:** Private

**Auto-sync:** If collection is empty, automatically triggers sync before returning data

**Example:**
```bash
curl "http://localhost:5001/api/reports/673cdd0f8a3b2c3d4e5f6789/records?type=purchases&page=0&pageSize=10&search=COMERCIAL" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "_id": "673cdd0f8a3b2c3d4e5f6789",
        "companyId": "673cdd0f8a3b2c3d4e5f6788",
        "tipo": "purchases",
        "fornecedor": "COMERCIAL PICA-PAU LTDA",
        "data_compra": "2025-10-17T00:00:00.000Z",
        "numero_nfe": "000000504",
        "cfop": "2.101 - Compra para Industrializacao",
        "valor_total": 49116.38,
        "icms": 5893.97,
        "ipi": 0,
        "pis": 713.17,
        "cofins": 3284.9,
        "bruto": 0,
        "createdAt": "2025-11-19T20:00:00.000Z",
        "updatedAt": "2025-11-19T20:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 0,
      "pageSize": 10,
      "total": 404,
      "totalPages": 41
    }
  }
}
```

### 3. GET /api/reports/:companyId/summary

Get aggregated summary of purchases or sales data from database.

**Parameters:**
- `companyId` (path) - Company ID
- `type` (query) - "purchases" or "sales" (required)

**Access:** Private

**Auto-sync:** If collection is empty, automatically triggers sync before returning data

**Example:**
```bash
curl "http://localhost:5001/api/reports/673cdd0f8a3b2c3d4e5f6789/summary?type=purchases" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 404,
      "totalValue": 2578714.28,
      "totalICMS": 90957.00,
      "totalIPI": 5283.71,
      "totalPIS": 5484.08,
      "totalCOFINS": 25265.21,
      "averageValue": 6383.45
    },
    "byEntity": [
      {
        "name": "COMERCIAL PICA-PAU LTDA",
        "total": 250000.00,
        "count": 25
      }
    ],
    "byMonth": [
      {
        "month": "2025-10",
        "total": 2578714.28,
        "count": 404
      }
    ],
    "taxesBreakdown": [
      { "name": "ICMS", "value": 90957.00 },
      { "name": "IPI", "value": 5283.71 },
      { "name": "COFINS", "value": 25265.21 },
      { "name": "PIS", "value": 5484.08 }
    ],
    "records": [],
    "fileName": "Compras_AVM.xlsx",
    "type": "purchases"
  }
}
```

## Sync Service

### syncExcelToDb(companyId, type)

Internal service function to sync Excel data to database.

**Process:**
1. Validates company and file path
2. Parses Excel file using canonical field mapping
3. Deletes old records for company+type
4. Bulk inserts new records (in chunks of 1000)
5. Calculates and returns statistics

**Usage in code:**
```javascript
const { syncExcelToDb } = require('../services/syncService');
const result = await syncExcelToDb('673cdd0f8a3b2c3d4e5f6789', 'purchases');
```

## Frontend Changes

### PurchasesTable Component
- Now fetches data from `/api/reports/:companyId/records` instead of `/purchases`
- Uses server-side pagination (page index is 0-based)
- Reads `selectedCompanyId` from localStorage
- Properly handles MongoDB `_id` field

### ReportsPage Component
- Added "Sincronizar Dados" button (visible only to admins)
- Stores selected company ID in localStorage
- Handles sync status and displays messages
- Auto-refreshes data after sync

## Validation Scripts

### dev-sync.sh
Tests sync endpoints and fetches first page of data.

**Usage:**
```bash
TOKEN=your_jwt_token COMPANY=company_id ./scripts/dev-sync.sh
```

### check-summary.sh
Compares summary aggregation with manual calculation from records endpoint.

**Usage:**
```bash
TOKEN=your_jwt_token COMPANY=company_id TYPE=purchases ./scripts/check-summary.sh
```

## Migration Notes

1. **First Access Auto-sync**: On first access after deployment, the system will automatically sync data from Excel files when the `/summary` or `/records` endpoints are called and the collection is empty.

2. **Manual Sync**: Admins can manually trigger sync using the "Sincronizar Dados" button in the frontend or by calling the POST `/sync` endpoint.

3. **Rate Limiting**: The sync endpoint has a 5-minute cooldown to prevent abuse. Repeated calls within the cooldown period will return a 429 status.

4. **Data Consistency**: All fields are now canonized at parse time. No reliance on `outras_info` for core fields (valor_total, icms, ipi, pis, cofins, etc.).

## Performance Considerations

- **Bulk Insert**: Uses MongoDB `insertMany` with chunks of 1000 records for efficiency
- **Indices**: Proper indices on companyId, entity fields, and dates for fast queries
- **Pagination**: Server-side pagination reduces data transfer
- **Aggregations**: MongoDB aggregation pipeline for efficient summary calculations
- **No Re-parsing**: Once synced, data is read from database instead of re-parsing Excel on every request

## Testing

Test Excel files:
- `Compras_AVM.xlsx` - 404 purchase records
- `Vendas_AVM.xlsx` - 152 sales records

All records have correct non-zero values for monetary fields.
