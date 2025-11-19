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
- Fornecedor / Supplier / Fornecedor/Cliente (Nome Fantasia)
- Data de Compra / Data de Registro (completa) / Data de Emissão
- CFOP / CFOP de Entrada
- Número NFe / Nota Fiscal
- Valor Total / Total / Total de Mercadoria
- ICMS / Valor do ICMS
- IPI / Valor do IPI
- COFINS / Valor do COFINS
- PIS / Valor do PIS

**Sales Files** should contain columns (aliases recognized):
- Cliente / Customer / Cliente (Nome Fantasia)
- Data de Emissão / Data de Emissão (completa) / Data de Venda
- CFOP / CFOP de Saída
- Número NFe / Nota Fiscal
- Valor Total / Total / Total de Mercadoria
- ICMS / Valor do ICMS
- IPI / Valor do IPI
- COFINS / Valor do COFINS
- PIS / Valor do PIS

**Canonical Field Names**

After parsing, all records are canonized to contain these standard fields:

*Purchases (Compras):*
- `fornecedor` (string): Supplier name
- `data_compra` (ISO date string): Purchase date
- `numero_nfe` (string): Invoice number
- `cfop` (string): CFOP code
- `valor_total` (number): Total value
- `icms` (number): ICMS tax
- `ipi` (number): IPI tax
- `pis` (number): PIS tax
- `cofins` (number): COFINS tax

*Sales (Vendas):*
- `cliente` (string): Customer name
- `data_emissao` (ISO date string): Emission date
- `numero_nfe` (string): Invoice number
- `cfop` (string): CFOP code
- `valor_total` (number): Total value
- `icms` (number): ICMS tax
- `ipi` (number): IPI tax
- `pis` (number): PIS tax
- `cofins` (number): COFINS tax

All numeric fields are guaranteed to be present (defaulting to 0 if not in source data). Dates are always converted to ISO 8601 strings.

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

**Table displaying R$ 0,00 in all lines**
- This issue has been resolved by canonizing the parser
- Ensure you're using the latest version of the code
- Verify that the Excel file contains the expected columns
- The parser now automatically promotes all tax fields (ICMS, IPI, PIS, COFINS) to the root level
- Check that column headers match one of the recognized aliases (see Excel File Format section)
- If using custom column names, add them to the aliases in `utils/excelParser.js`

**PIS values not showing**
- PIS is now a canonical field at the root level
- Frontend tables include a PIS column
- Verify the Excel file has a column matching: "PIS", "Valor do PIS", "vl_pis", or "valor_pis"

**Date fields showing incorrectly**
- Dates are now returned as ISO 8601 strings from the API
- Frontend automatically formats them to pt-BR locale
- Ensure Excel dates are in a recognized format (DD/MM/YYYY or Excel serial numbers)
