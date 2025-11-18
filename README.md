# meu-app-relatorios

Sistema de gerenciamento de relatórios com autenticação JWT, MongoDB e funcionalidade de importação de planilhas Excel.

## Funcionalidades

### Autenticação e Gerenciamento de Usuários
- Sistema de login com JWT
- Gerenciamento de empresas
- Portal administrativo para gestão de usuários
- Controle de acesso baseado em roles (Admin, Manager, User)

### Relatórios de Compras
- **Carregamento Automático**: Por padrão, o sistema carrega dados automaticamente da planilha `Compras_AVM.xlsx` versionada no repositório durante o startup do servidor
- **Importação Manual (Opcional)**: Disponível via variável de ambiente `VITE_ENABLE_UPLOAD=true`
  - Upload de arquivos .xlsx/.xls com dados de compras
  - Modos de Importação: 
    - Append: Adiciona novos registros
    - Replace: Substitui registros existentes da mesma fonte
- **Recarga Manual**: Endpoint POST `/api/purchases/reload-repo` para recarregar dados do repositório sob demanda
- **Dashboard Interativo**:
  - Cards com resumo de totais (compras, valores, impostos)
  - Gráfico de barras: Top 10 fornecedores
  - Gráfico de pizza: Composição de impostos (ICMS, IPI, COFINS)
  - Gráfico de linha: Evolução mensal de compras
- **Tabela de Dados**:
  - Paginação server-side
  - Busca por fornecedor, CFOP ou número de NFe
  - Ordenação por data
  - Exibição de todos os campos importados

## Tecnologias

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT para autenticação
- Multer para upload de arquivos
- XLSX para processamento de planilhas Excel

### Frontend
- React 19
- Vite
- Material-UI (MUI)
- Recharts para gráficos
- React Dropzone para upload
- MUI DataGrid para tabelas

## Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Iniciar servidor backend
npm start

# Em outro terminal, iniciar frontend em modo desenvolvimento
npm run client

# Ou construir frontend para produção
npm run client:build
```

## Variáveis de Ambiente

```env
# Backend
MONGODB_URI=mongodb://localhost:27017/meu-app-relatorios
JWT_SECRET=seu_secret_jwt_aqui
PORT=5001

# Caminho da planilha Excel (opcional - se não definido, usa fallbacks automáticos)
# EXCEL_SOURCE_PATH=./Compras_AVM.xlsx

# Habilitar auto-importação do Excel no startup do servidor (default: true)
# ENABLE_REPO_EXCEL_BOOTSTRAP=true

# Frontend - Habilitar painel de upload manual (default: false)
# VITE_ENABLE_UPLOAD=false
```

### Configuração do Caminho da Planilha

O sistema busca a planilha `Compras_AVM.xlsx` automaticamente nos seguintes locais (em ordem):
1. Caminho definido em `EXCEL_SOURCE_PATH` (se configurado)
2. `./Compras_AVM.xlsx` (raiz do repositório)
3. `./data/Compras_AVM.xlsx`
4. `./assets/Compras_AVM.xlsx`
5. `./public/Compras_AVM.xlsx`

Se a planilha estiver em outro local, configure `EXCEL_SOURCE_PATH` com o caminho relativo ou absoluto.

### Auto-Importação no Startup

Por padrão, o sistema importa automaticamente os dados da planilha do repositório quando o servidor inicia (`ENABLE_REPO_EXCEL_BOOTSTRAP=true`). Para desabilitar este comportamento, defina a variável como `false`.

### Painel de Upload Manual

Por padrão, o painel de upload está oculto (`VITE_ENABLE_UPLOAD=false`), pois o sistema carrega dados automaticamente. Para habilitar o upload manual na interface, defina `VITE_ENABLE_UPLOAD=true`.

### Recarregar Dados Manualmente

Se você atualizar a planilha `Compras_AVM.xlsx` no repositório e quiser recarregar os dados sem reiniciar o servidor, use o endpoint de reload:

```bash
# Exemplo com curl (substitua o token JWT)
curl -X POST http://localhost:5001/api/purchases/reload-repo \
  -H "Authorization: Bearer SEU_TOKEN_JWT_AQUI"
```

Ou faça uma requisição POST para `/api/purchases/reload-repo` usando qualquer cliente HTTP. O endpoint:
- Requer autenticação (token JWT no header Authorization)
- Apaga todos os registros anteriores com source_filename: "Repo-Compras-AVM"
- Importa os dados atualizados da planilha
- Retorna o número de registros importados

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de usuário

### Compras
- `POST /api/purchases/upload` - Upload de planilha Excel (requer autenticação, disponível apenas se VITE_ENABLE_UPLOAD=true)
- `POST /api/purchases/reload-repo` - Recarregar dados da planilha do repositório (requer autenticação)
- `GET /api/purchases` - Listar compras com paginação (requer autenticação)

### Relatórios de Compras
- `GET /api/purchase-reports/summary` - Resumo geral (requer autenticação)
- `GET /api/purchase-reports/by-supplier` - Totais por fornecedor (requer autenticação)
- `GET /api/purchase-reports/by-cfop` - Totais por CFOP (requer autenticação)
- `GET /api/purchase-reports/monthly` - Evolução mensal (requer autenticação)
- `GET /api/purchase-reports/taxes-breakdown` - Composição de impostos (requer autenticação)

## Estrutura da Planilha Excel

A planilha deve conter dados de compras/notas fiscais. O sistema detecta automaticamente a linha de cabeçalho analisando as primeiras 20 linhas da planilha.

### Campos Suportados e Aliases

O sistema aceita múltiplos nomes de cabeçalho (aliases) para cada campo. A normalização remove acentos, símbolos e espaços automaticamente.

| Campo | Aliases Aceitos | Formato/Exemplo |
|-------|----------------|-----------------|
| **fornecedor** | fornecedor, supplier, vendedor, emitente, razao_social, razao_social_fornecedor, nome_fornecedor, fornecedor/cliente (nome fantasia), nome_fantasia, cliente | Texto |
| **cfop** | cfop, cfop de entrada, codigo_cfop | Texto (ex: "2.101 - Compra para Industrialização") |
| **numero_nfe** | numero_nfe, nfe, nota, numero, numero_nf, n_nf, n_nfe, no_nf, no_nfe, num_nf, numero_da_nfe, nº nf-e, nº nfe, nº nf, nota_fiscal, num_nota, numero_nota | Texto (ex: "000000504") |
| **data_compra** | data_compra, data, date, data_emissao, emissao, data da emissao, data_entrada, data_lancamento, dt_emissao, dt_entrada, data de registro (completa), data_registro | dd/mm/yyyy, MM/DD/YY, dd-mm-yyyy, yyyy-mm-dd |
| **valor_total** | valor_total, total, valor, valor_nota, valor da nota, valor_total_nf, valor_total_da_nf, valor_total_nfe, vl_total, valor_documento, valor_total_da_nota, total de mercadoria, valor_mercadoria, total_mercadoria | R$ 1.234,56 ou R$ 1,234.56 |
| **icms** | icms, vl_icms, valor_icms, valor do icms | R$ 1.234,56 ou R$ 1,234.56 |
| **ipi** | ipi, vl_ipi, valor_ipi, valor do ipi | R$ 1.234,56 ou R$ 1,234.56 |
| **cofins** | cofins, vl_cofins, valor_cofins, valor do cofins | R$ 1.234,56 ou R$ 1,234.56 |
| **pis** | pis, vl_pis, valor_pis, valor do pis | R$ 1.234,56 ou R$ 1,234.56 |
| **bruto** | bruto, valor_bruto, vl_bruto, valor_produtos, valor_mercadorias | R$ 1.234,56 ou R$ 1,234.56 |

### Formatos de Números Suportados

O sistema aceita múltiplos formatos de números:
- **PT-BR**: `1.234,56` (ponto=milhar, vírgula=decimal)
- **US/Excel**: `1,234.56` (vírgula=milhar, ponto=decimal)
- **Com prefixos**: `R$ 1.234,56`, `$ 1,234.56`
- **Com espaços**: `R$  1,234.56`
- **Negativos**: `(1.234,56)` ou `-1.234,56`

### Formatos de Data Suportados

O sistema detecta automaticamente o formato de data:
- **MM/DD/YY**: `10/17/25` → 17 de outubro de 2025
- **dd/mm/yyyy**: `17/10/2025` → 17 de outubro de 2025
- **dd-mm-yyyy**: `17-10-2025` → 17 de outubro de 2025
- **ISO**: `2025-10-17` → 17 de outubro de 2025

Para datas ambíguas (ex: `01/05/25`), o sistema assume formato MM/DD/YY (padrão americano).

### Dicas para Preparar a Planilha

1. **Linha de cabeçalho clara**: Mantenha uma linha com nomes de colunas próximos aos aliases listados acima
2. **Evite linhas de totalização**: Linhas com palavras como "Total", "Subtotal", "Soma" no campo fornecedor serão ignoradas automaticamente
3. **Campos obrigatórios**: Pelo menos **fornecedor** OU **numero_nfe** devem estar preenchidos
4. **Colunas extras**: Colunas não mapeadas serão armazenadas em `outras_info` e preservadas
5. **Linhas vazias**: Linhas completamente vazias são ignoradas automaticamente

### Exemplo de Planilha Compatível

| Data de Registro (completa) | Fornecedor/Cliente (Nome Fantasia) | CFOP de Entrada | Nota Fiscal | Total de Mercadoria | Valor do IPI | Valor do ICMS | Valor do PIS | Valor do COFINS |
|------------------------------|-------------------------------------|-----------------|-------------|---------------------|--------------|---------------|--------------|-----------------|
| 10/17/25 | COMERCIAL PICA-PAU LTDA | 2.101 - Compra para Industrialização | 000000504 | R$  49,116.38 | R$  0.00 | R$  5,893.97 | R$  713.17 | R$  3,284.90 |
| 10/15/25 | JNB INDUSTRIA E COMERCIO LTDA | 2.101 - Compra para Industrialização | 000000122 | R$  24,600.00 | R$  0.00 | R$  2,952.00 | R$  0.00 | R$  0.00 |

Colunas não mapeadas serão armazenadas em `outras_info`.

## Testes Manuais

Consulte [TEST_INSTRUCTIONS.md](TEST_INSTRUCTIONS.md) para instruções detalhadas de teste.

## Segurança

Consulte [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md) para análise de segurança completa.

**Nota de Segurança**: 
- Todas as rotas de compras/relatórios exigem autenticação
- Upload limitado a 25MB
- Apenas arquivos .xlsx e .xls são aceitos
- A biblioteca xlsx tem vulnerabilidades conhecidas sem correção disponível

## Scripts PM2

```bash
# Iniciar com PM2
npm run pm2:start

# Parar PM2
npm run pm2:stop

# Reiniciar PM2
npm run pm2:restart

# Status PM2
npm run pm2:status
```

## Desenvolvimento

```bash
# Backend em modo watch
npm run dev

# Frontend em modo desenvolvimento
npm run client
```

## Licença

ISC