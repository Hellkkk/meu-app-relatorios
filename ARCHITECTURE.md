# Feature Architecture: Purchase Reports

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              ReportsPage Component                      │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────────┐               │ │
│  │  │ UploadPanel  │  │ Summary Cards     │               │ │
│  │  │ - Drag/Drop  │  │ - Total Compras   │               │ │
│  │  │ - Progress   │  │ - ICMS/IPI/COFINS │               │ │
│  │  └──────────────┘  └──────────────────┘               │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │           Charts (Recharts)                      │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │ │
│  │  │  │  Bar     │ │   Pie    │ │  Line    │         │  │ │
│  │  │  │(Supplier)│ │ (Taxes)  │ │(Monthly) │         │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘         │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │    PurchasesTable (MUI DataGrid)                 │  │ │
│  │  │  - Server-side Pagination                        │  │ │
│  │  │  - Search & Filter                               │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│                                                              │
│  ┌─────────────────────┐          ┌─────────────────────┐  │
│  │  Purchase Routes    │          │  Report Routes      │  │
│  │  /api/purchases     │          │  /api/purchase-     │  │
│  │                     │          │       reports       │  │
│  │  - POST /upload     │          │  - GET /summary     │  │
│  │  - GET /           │          │  - GET /by-supplier │  │
│  └─────────┬───────────┘          │  - GET /by-cfop     │  │
│            │                      │  - GET /monthly     │  │
│            │                      │  - GET /taxes-      │  │
│            │                      │         breakdown   │  │
│            │                      └──────────┬──────────┘  │
│            │                                 │              │
│            ▼                                 ▼              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Controllers                              │  │
│  │  ┌────────────────────┐  ┌───────────────────────┐  │  │
│  │  │ purchaseController │  │  reportController     │  │  │
│  │  │  - uploadExcel()   │  │  - summary()          │  │  │
│  │  │  - listPurchases() │  │  - bySupplier()       │  │  │
│  │  │                    │  │  - byCFOP()           │  │  │
│  │  │  • Parse Excel     │  │  - monthly()          │  │  │
│  │  │  • Normalize data  │  │  - taxesBreakdown()   │  │  │
│  │  │  • Handle modes    │  │                       │  │  │
│  │  └────────────────────┘  └───────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Purchase Model (Mongoose)                │  │
│  │                                                        │  │
│  │  Schema:                                              │  │
│  │  - data_compra: Date                                  │  │
│  │  - fornecedor: String (indexed)                       │  │
│  │  - cfop: String (indexed)                             │  │
│  │  - numero_nfe: String                                 │  │
│  │  - valor_total, icms, ipi, cofins, bruto: Number     │  │
│  │  - outras_info: Object                                │  │
│  │  - source_filename: String                            │  │
│  │  - imported_at: Date                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    MongoDB      │
                    │   (Purchases)   │
                    └─────────────────┘
```

## Data Flow

### Upload Flow
1. User selects Excel file via drag-drop or file picker
2. User selects mode (Append/Replace) and enters source label
3. Frontend sends multipart/form-data POST to `/api/purchases/upload`
4. Backend (multer) receives file in memory buffer
5. XLSX library parses Excel file
6. Controller normalizes headers and data (PT-BR format)
7. If mode=replace, delete existing records with same source
8. Insert new records into MongoDB
9. Return success with count
10. Frontend refreshes dashboard

### Dashboard Data Flow
1. Frontend loads and calls multiple endpoints in parallel:
   - `/api/purchase-reports/summary`
   - `/api/purchase-reports/by-supplier`
   - `/api/purchase-reports/by-cfop`
   - `/api/purchase-reports/monthly`
   - `/api/purchase-reports/taxes-breakdown`
2. Backend runs MongoDB aggregations
3. Returns formatted data
4. Frontend renders:
   - Summary cards with totals
   - Charts with Recharts
   - Table with MUI DataGrid

### Table Pagination Flow
1. User navigates table or searches
2. Frontend sends GET to `/api/purchases?page=X&limit=Y&q=search`
3. Backend queries MongoDB with skip/limit
4. Returns paginated results + total count
5. Frontend updates table display

## Key Features

### Excel Processing
- ✅ Supports .xlsx and .xls formats
- ✅ Reads first sheet only
- ✅ Normalizes column headers (lowercase, no accents)
- ✅ Maps common column names to standard fields
- ✅ Parses Brazilian number format (1.234,56)
- ✅ Parses dates (dd/mm/yyyy or Excel serial)
- ✅ Stores unmapped columns in outras_info

### Import Modes
- **Append**: Adds new records without deleting existing ones
- **Replace**: Deletes existing records with same source_filename, then inserts new ones

### Security
- ✅ JWT authentication required
- ✅ 25MB file size limit
- ✅ File type validation
- ⚠️ Rate limiting recommended for production
- ⚠️ XLSX library has known vulnerabilities (no fix available)

### Performance
- ✅ Server-side pagination (reduces client load)
- ✅ MongoDB indexes on fornecedor, cfop, data_compra
- ✅ Parallel API calls for dashboard data
- ✅ Lean queries for table data
