# Backend API Documentation

Este é um backend construído com Express.js, MongoDB Atlas e autenticação JWT.

## Configuração

### 1. Instalação de Dependências

```bash
npm install
```

### 2. Configuração de Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/myDatabase?retryWrites=true&w=majority
JWT_SECRET=your_secure_jwt_secret_key
PORT=5000
```

### 3. Iniciar o Servidor

```bash
# Modo de produção
npm start

# Modo de desenvolvimento (com auto-reload)
npm run dev
```

## Estrutura do Projeto

```
├── config/
│   └── database.js       # Configuração de conexão com MongoDB
├── models/
│   └── User.js          # Modelo de usuário
├── routes/
│   └── auth.js          # Rotas de autenticação
├── middleware/
│   └── auth.js          # Middleware de autenticação JWT
├── server.js            # Arquivo principal do servidor
└── .env.example         # Exemplo de variáveis de ambiente
```

## Endpoints da API

### 1. Health Check

**GET** `/api/health`

Verifica se o servidor está rodando.

**Resposta:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Registro de Usuário

**POST** `/api/auth/register`

Registra um novo usuário no sistema.

**Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Resposta de Erro (400):**
```json
{
  "success": false,
  "message": "User with this email or username already exists"
}
```

### 3. Login

**POST** `/api/auth/login`

Autentica um usuário e retorna um token JWT.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Resposta de Erro (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 4. Rota Protegida (Exemplo)

**GET** `/api/protected`

Exemplo de rota protegida que requer autenticação.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Access to protected route granted",
  "user": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "john@example.com"
  }
}
```

**Resposta de Erro (401):**
```json
{
  "success": false,
  "message": "No token provided, authorization denied"
}
```

## Segurança

- Senhas são armazenadas com hash usando bcryptjs (10 rounds de salt)
- Tokens JWT expiram em 24 horas
- CORS está habilitado para permitir requisições cross-origin
- Validação de entrada em todos os endpoints

## Modelo de Usuário

```javascript
{
  username: String (required, unique, min 3 chars),
  email: String (required, unique, valid email format),
  password: String (required, min 6 chars, stored as hash),
  timestamps: true (createdAt, updatedAt)
}
```

## Middleware de Autenticação

O middleware `authMiddleware` pode ser usado para proteger rotas:

```javascript
const authMiddleware = require('./middleware/auth');

app.get('/api/protected-route', authMiddleware, (req, res) => {
  // req.user contém os dados decodificados do token
  res.json({ user: req.user });
});
```

## Testes

Para testar a API manualmente, você pode usar ferramentas como:
- Postman
- Insomnia
- curl
- O script de teste incluído: `node test-api.js`

## Dependências Principais

- **express**: Framework web
- **mongoose**: ODM para MongoDB
- **jsonwebtoken**: Geração e verificação de tokens JWT
- **bcryptjs**: Hashing de senhas
- **dotenv**: Gerenciamento de variáveis de ambiente
- **cors**: Habilitação de CORS
