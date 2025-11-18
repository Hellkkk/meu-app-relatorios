# Multi-File Excel Reports Feature

## Overview

This feature enables the application to support multiple Excel files in the repository, allowing companies to have separate report files for Purchases (Compras) and Sales (Vendas). Users can select a company and report type to view customized dashboards.

## Features

### Backend

1. **File Discovery Utility** (`utils/excelFileDiscovery.js`)
   - Discovers all `.xlsx` files in a configurable directory
   - Supports `EXCEL_FILES_DIR` environment variable (defaults to project root)
   - Returns file metadata including path, size, and modification time

2. **Enhanced Excel Parser** (`utils/excelParser.js`)
   - Supports both Purchases and Sales report types
   - Handles different column aliases:
     - **Purchases**: `fornecedor`, `data_compra`, `cfop_de_entrada`
     - **Sales**: `cliente`, `data_emissao`, `cfop`
   - Auto-detects header rows
   - Parses Brazilian number and date formats

3. **Company Model Extensions**
   - Added `purchasesReportPath` field (optional, string)
   - Added `salesReportPath` field (optional, string)
   - Stores relative paths to assigned Excel files

4. **New API Endpoints**

   **List Available Excel Files** (Admin only)
   ```
   GET /api/reports/xlsx-files
   ```
   Returns all `.xlsx` files found in the configured directory.

   **Get Company Report Files**
   ```
   GET /api/companies/:id/report-files
   ```
   Returns the configured report file paths for a company.

   **Update Company Report Files** (Admin only)
   ```
   PUT /api/companies/:id/report-files
   Body: {
     purchasesReportPath: "Compras_AVM.xlsx",
     salesReportPath: "Vendas_AVM.xlsx"
   }
   ```
   Updates the report file assignments for a company.

   **Generate Report Summary**
   ```
   GET /api/reports/:companyId/summary?type=purchases|sales
   ```
   Generates dashboard data from the assigned Excel file.
   - Parses the Excel file
   - Calculates totals and aggregations
   - Returns summary, charts data, and top records

### Frontend

1. **Reports Page Enhancements** (`src/pages/ReportsPage.jsx`)
   - Company selector (shows only user's linked companies)
   - Report type toggle (Purchases / Sales)
   - Auto-loads dashboard when company and type are selected
   - Dynamic chart titles based on report type

2. **Report Files Configuration** (`src/components/companies/ReportFilesModal.jsx`)
   - Admin-only modal for configuring company report files
   - Dropdown selectors for both Purchases and Sales files
   - Auto-filters files by name (Compras/Vendas)
   - Accessible from Companies management page

3. **Updated Components**
   - `PurchasesTable`: Now handles both fornecedor (purchases) and cliente (sales)
   - `PurchasesBySupplierChart`: Accepts dynamic title prop
   - `MonthlyPurchasesChart`: Accepts dynamic title prop
   - `ReportSummaryCards`: Updated field mappings

## Usage

### For Administrators

1. **Upload Excel Files**
   - Place `.xlsx` files in the project root (or configured `EXCEL_FILES_DIR`)
   - Files should follow naming convention: `Compras_[Company].xlsx` or `Vendas_[Company].xlsx`

2. **Assign Files to Companies**
   - Navigate to Companies management page
   - Click "Relatórios" button on a company card
   - Select appropriate files for Purchases and Sales
   - Save configuration

### For Users

1. **View Reports**
   - Navigate to Reports page
   - Select a company from the dropdown (only linked companies shown)
   - Choose report type: Compras (Purchases) or Vendas (Sales)
   - Dashboard automatically loads with data from the configured file

## Configuration

### Environment Variables

- `EXCEL_FILES_DIR`: Directory to search for Excel files (default: project root)
- No changes required for existing `EXCEL_SOURCE_PATH` variable

### Excel File Format

**Purchases Files** should contain columns (aliases recognized):
- Fornecedor / Supplier
- Data de Compra / Data de Registro / Data de Emissão
- CFOP / CFOP de Entrada
- Número NFe / Nota Fiscal
- Valor Total / Total
- ICMS, IPI, COFINS, PIS

**Sales Files** should contain columns (aliases recognized):
- Cliente / Customer
- Data de Emissão / Data de Venda
- CFOP / CFOP de Saída
- Número NFe / Nota Fiscal
- Valor Total / Total
- ICMS, IPI, COFINS, PIS

## Security Considerations

### Addressed
- ✅ Authentication required for all endpoints
- ✅ Authorization checks for company access
- ✅ Admin-only file management
- ✅ Path validation to prevent directory traversal
- ✅ File existence validation

### Known Limitations
- ⚠️ No rate limiting on new endpoints (consistent with existing routes)
- ⚠️ No file upload validation (files must be manually placed on server)

## Testing

Run the integration tests:

```bash
# Set admin token
export TEST_ADMIN_TOKEN="your-admin-token-here"

# Run tests
node test-multi-file-reports.js
```

Tests verify:
- File discovery endpoint
- Company report file configuration
- Report generation for both types

## Future Enhancements

Potential improvements:
- Add rate limiting to all API endpoints
- Implement file upload interface
- Add caching layer for parsed Excel data
- Support for additional report types
- Real-time file monitoring and auto-refresh
- Export functionality for generated reports

## Troubleshooting

**No Excel files found**
- Check `EXCEL_FILES_DIR` configuration
- Ensure files have `.xlsx` extension
- Verify file permissions

**Report generation fails**
- Verify file path is correctly assigned to company
- Check Excel file structure matches expected format
- Review server logs for parsing errors

**Company selector empty**
- User must be linked to at least one company
- Contact administrator to set up company links
