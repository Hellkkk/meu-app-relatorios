# UI Preview - Purchase Reports Page

## Layout Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Navbar                                    [User Menu]                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  RELATÓRIOS DE COMPRAS                                                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Importar Planilha de Compras                                        ││
│  │                                                                      ││
│  │  ┌────────────────────────────────────────────────────────────┐    ││
│  │  │  📁  Arraste e solte um arquivo Excel aqui,               │    ││
│  │  │       ou clique para selecionar                            │    ││
│  │  │       (Apenas arquivos .xlsx ou .xls)                      │    ││
│  │  └────────────────────────────────────────────────────────────┘    ││
│  │                                                                      ││
│  │  [Modo: Adicionar (Append) ▼]  [Etiqueta: Compras-2025-10____]    ││
│  │                                                                      ││
│  │  [📤 Importar Arquivo]                                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                      │
│  │ 🛒   │  │ 💰   │  │ 💰   │  │ 💰   │  │ 💰   │                      │
│  │Total │  │Valor │  │ICMS  │  │IPI   │  │COFINS│                      │
│  │Comp. │  │Total │  │      │  │      │  │      │                      │
│  │ 150  │  │R$150K│  │R$15K │  │R$5K  │  │R$3K  │                      │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘                      │
│                                                                           │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐        │
│  │Top Fornecedores  │ │Composição        │ │Evolução Mensal   │        │
│  │                  │ │de Impostos       │ │                  │        │
│  │    ▁▃▅▇█         │ │    ◐             │ │   ╱             │        │
│  │                  │ │                  │ │  ╱               │        │
│  │ Forn A ████████  │ │ ICMS  65%        │ │ ╱                │        │
│  │ Forn B ██████    │ │ IPI   20%        │ │╱_________________│        │
│  │ Forn C ████      │ │ COFINS 15%       │ │Jan Feb Mar Apr   │        │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘        │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Tabela de Compras                                                   ││
│  │                                                                      ││
│  │ [🔍 Pesquisar por fornecedor, CFOP ou número de NFe_____________]  ││
│  │                                                                      ││
│  │ ┌──────────┬─────────────┬─────────┬──────┬───────────┬──────────┐ ││
│  │ │Data      │Fornecedor   │Nº NFe   │CFOP  │Valor Total│ICMS      │ ││
│  │ ├──────────┼─────────────┼─────────┼──────┼───────────┼──────────┤ ││
│  │ │01/10/2025│Fornecedor A │12345    │5102  │R$ 1.500,00│R$ 180,00 │ ││
│  │ │02/10/2025│Fornecedor B │12346    │5102  │R$ 2.000,00│R$ 240,00 │ ││
│  │ │03/10/2025│Fornecedor C │12347    │6102  │R$ 1.800,00│R$ 216,00 │ ││
│  │ │04/10/2025│Fornecedor A │12348    │5102  │R$ 2.200,00│R$ 264,00 │ ││
│  │ │05/10/2025│Fornecedor D │12349    │6102  │R$ 1.600,00│R$ 192,00 │ ││
│  │ └──────────┴─────────────┴─────────┴──────┴───────────┴──────────┘ ││
│  │                                                                      ││
│  │ Rows per page: [10 ▼]               [< 1 2 3 4 5 >]   Total: 150   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Upload Panel
- **Visual**: Dashed border box with cloud upload icon
- **Features**:
  - Drag-and-drop zone (hover effect changes background)
  - File name display after selection
  - Mode selector dropdown (Append/Replace)
  - Source label text input
  - Progress bar during upload
  - Success/error alerts

### 2. Summary Cards (Row of 5)
- **Card 1**: Total de Compras (Shopping cart icon, blue)
- **Card 2**: Valor Total (Money icon, green)
- **Card 3**: ICMS (Money icon, orange)
- **Card 4**: IPI (Money icon, purple)
- **Card 5**: COFINS (Money icon, red)

### 3. Charts (3 columns)

#### Left - Bar Chart (PurchasesBySupplierChart)
- **Title**: "Top Fornecedores"
- **Type**: Horizontal bars
- **Data**: Top 10 suppliers by value
- **Colors**: Blue (#1976d2)
- **Features**: Angled labels, currency formatting

#### Center - Pie Chart (TaxesBreakdownChart)
- **Title**: "Composição de Impostos"
- **Type**: Pie/Donut chart
- **Data**: ICMS, IPI, COFINS percentages
- **Colors**: Blue, Teal, Yellow
- **Features**: Percentage labels, legend

#### Right - Line Chart (MonthlyPurchasesChart)
- **Title**: "Evolução Mensal"
- **Type**: Line chart
- **Data**: Monthly totals over time
- **Colors**: Blue (#1976d2)
- **Features**: Month labels (MM/YYYY), currency Y-axis

### 4. Data Table (PurchasesTable)
- **Title**: "Tabela de Compras"
- **Features**:
  - Search bar with placeholder
  - Sortable columns (click header)
  - Server-side pagination
  - Rows per page selector (5, 10, 25, 50)
  - Page navigation buttons
  - Total count display
- **Columns**:
  - Data (formatted as dd/mm/yyyy)
  - Fornecedor (truncated if long)
  - Nº NFe
  - CFOP
  - Valor Total (currency format)
  - ICMS (currency format)
  - IPI (currency format)
  - COFINS (currency format)

## Responsive Behavior

### Desktop (> 1200px)
- Full layout as shown
- 3 charts side-by-side
- 5 summary cards in one row

### Tablet (768px - 1200px)
- 2 charts per row (3rd wraps)
- 3 cards per row + 2 on second row
- Table scrolls horizontally

### Mobile (< 768px)
- 1 chart per row (stacked)
- 2 cards per row
- Table scrolls horizontally with sticky first column
- Upload panel collapses mode/source vertically

## User Interaction Flow

1. **Upload**:
   ```
   User drags file → Drop zone highlights → 
   File selected → User enters source → 
   Clicks "Importar" → Progress bar → 
   Success message → Dashboard refreshes
   ```

2. **View Dashboard**:
   ```
   Page loads → API calls in parallel → 
   Loading spinner → Data arrives → 
   Cards update → Charts render → Table populates
   ```

3. **Search Table**:
   ```
   User types in search box → 
   500ms debounce → API call → 
   Table updates with filtered results → 
   Pagination resets to page 1
   ```

4. **Navigate Table**:
   ```
   User clicks page 2 → API call → 
   Table updates → Scroll to top
   ```

## Material-UI Theme
- **Primary Color**: Blue (#1976d2)
- **Secondary Color**: Orange (#ed6c02)
- **Typography**: Roboto font family
- **Paper Elevation**: 1-3
- **Border Radius**: 4px default

## Accessibility
- ✅ Keyboard navigation supported
- ✅ ARIA labels on interactive elements
- ✅ Color contrast meets WCAG AA
- ✅ Screen reader friendly table
- ✅ Focus indicators on all controls
