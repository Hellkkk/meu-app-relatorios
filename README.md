# meu-app-relatorios

Sistema de gerenciamento de relatórios com autenticação JWT, MongoDB e funcionalidade de importação de planilhas Excel.

## Funcionalidades

### Autenticação e Gerenciamento de Usuários
- Sistema de login com JWT
- Gerenciamento de empresas
- Portal administrativo para gestão de usuários
- Controle de acesso baseado em roles (Admin, Manager, User)

### Relatórios de Compras (Novo)
- **Importação de Planilhas Excel**: Upload de arquivos .xlsx/.xls com dados de compras
- **Modos de Importação**: 
  - Append: Adiciona novos registros
  - Replace: Substitui registros existentes da mesma fonte
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
MONGODB_URI=mongodb://localhost:27017/meu-app-relatorios
JWT_SECRET=seu_secret_jwt_aqui
PORT=5001
```

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de usuário

### Compras (Novo)
- `POST /api/purchases/upload` - Upload de planilha Excel (requer autenticação)
- `GET /api/purchases` - Listar compras com paginação (requer autenticação)

### Relatórios de Compras (Novo)
- `GET /api/purchase-reports/summary` - Resumo geral
- `GET /api/purchase-reports/by-supplier` - Totais por fornecedor
- `GET /api/purchase-reports/by-cfop` - Totais por CFOP
- `GET /api/purchase-reports/monthly` - Evolução mensal
- `GET /api/purchase-reports/taxes-breakdown` - Composição de impostos

## Estrutura da Planilha Excel

A planilha deve conter as seguintes colunas (cabeçalhos podem variar):

| Coluna | Alternativas | Formato |
|--------|--------------|---------|
| fornecedor | supplier, vendedor | Texto |
| cfop | - | Texto |
| numero_nfe | nfe, nota, numero | Texto |
| data_compra | data, date | dd/mm/yyyy |
| valor_total | total, valor | 1.234,56 (PT-BR) |
| icms | - | 1.234,56 (PT-BR) |
| ipi | - | 1.234,56 (PT-BR) |
| cofins | - | 1.234,56 (PT-BR) |
| bruto | valor_bruto | 1.234,56 (PT-BR) |

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