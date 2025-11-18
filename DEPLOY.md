# Deploy para AWS EC2

Este guia te ajudará a fazer o deploy do App Relatórios em uma instância EC2 da AWS.

## ⚠️ Requisitos Importantes

- **Node.js 20.19+ ou 22.12+** (obrigatório para Vite)
- **MongoDB** (local ou Atlas)
- **Instância EC2** (Amazon Linux 2 ou Ubuntu)

## 🚀 Deploy Rápido - Amazon Linux EC2

### 1. Setup Inicial (Execute apenas uma vez)

```bash
# Baixar e executar script de configuração
curl -O https://raw.githubusercontent.com/Hellkkk/meu-app-relatorios/main/setup-amazon-linux.sh
chmod +x setup-amazon-linux.sh
./setup-amazon-linux.sh

# Recarregar ambiente
source ~/.bashrc

# Verificar versão do Node.js (deve ser 20+)
node --version
```

### 2. Configurar Variáveis de Ambiente

```bash
cd meu-app-relatorios
cp .env.production .env
nano .env
```

**Configure estas variáveis no arquivo .env:**

```env
# Backend Configuration
BACKEND_PORT=5001
BACKEND_HOST=127.0.0.1

# Frontend Configuration
FRONTEND_PORT=3001

# MongoDB Atlas (recomendado)
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/relatorios

# OU MongoDB local
# MONGODB_URI=mongodb://localhost:27017/relatorios

# JWT Secret (gere uma chave forte)
JWT_SECRET=sua_chave_jwt_super_secreta_com_pelo_menos_32_caracteres

# URLs (substitua SEU_IP_EC2 pelo IP público da sua instância)
CLIENT_URL=http://SEU_IP_EC2:3001
CORS_ORIGIN=http://SEU_IP_EC2:3001,http://SEU_IP_EC2

# IMPORTANTE: NÃO defina NODE_ENV no .env
# NODE_ENV será definido pelo PM2 em runtime
# Definir NODE_ENV no .env quebra o build do Vite
```

### 3. Deploy da Aplicação

```bash
npm run deploy:amazon
```

## 🐧 Deploy para Ubuntu EC2

### 1. Setup Inicial

```bash
curl -O https://raw.githubusercontent.com/Hellkkk/meu-app-relatorios/main/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

### 2. Configurar e Deploy

```bash
cd /home/ubuntu/meu-app-relatorios
cp .env.production .env
nano .env  # Configure as variáveis
npm run deploy
```

## 🔧 Comandos Manuais (Se os scripts automáticos falharem)

### Para Amazon Linux:

```bash
# 1. Instalar Node.js 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# 2. Verificar versão
node --version  # Deve mostrar v20.x.x

# 3. Clonar repositório
git clone https://github.com/Hellkkk/meu-app-relatorios.git
cd meu-app-relatorios

# 4. Instalar dependências
npm install
npm install -g pm2

# 5. Configurar ambiente
cp .env.production .env
# Editar .env com suas configurações

# 6. Build e deploy
npm run client:build
node seed.js
pm2 start server.js --name backend
pm2 serve dist 3000 --name frontend --spa
pm2 save
pm2 startup
```

## 🛡️ Configuração do Security Group

Configure estas regras no Security Group da EC2:

| Tipo | Porta | Origem | Descrição |
|------|-------|---------|-----------|
| SSH | 22 | Seu IP | Acesso SSH |
| HTTP | 80 | 0.0.0.0/0 | HTTP público |
| HTTPS | 443 | 0.0.0.0/0 | HTTPS público |
| Custom TCP | 3001 | 0.0.0.0/0 | Frontend React |
| Custom TCP | 5001 | 0.0.0.0/0 | Backend API |

## 📊 Gerenciar Aplicação

```bash
# Ver status dos serviços
pm2 status

# Ver logs em tempo real
pm2 logs

# Reiniciar serviços
pm2 restart all

# Parar serviços
pm2 stop all

# Atualizar código
cd meu-app-relatorios
git pull origin main
npm run deploy:amazon
```

## 🔍 Diagnóstico e Verificação

### Verificar Configuração PM2

```bash
# Verificar que o cwd está correto (deve ser o subdiretório meu-app-relatorios)
pm2 describe relatorios-backend | grep cwd

# Deve mostrar: cwd: /home/ec2-user/meu-app-relatorios/meu-app-relatorios
# NÃO: /home/ec2-user/meu-app-relatorios (diretório pai)
```

### Verificar Variáveis de Ambiente

```bash
# Garantir que .env está no diretório correto
ls -la /home/ec2-user/meu-app-relatorios/meu-app-relatorios/.env

# Verificar conteúdo (deve ter BACKEND_PORT, não NODE_ENV no arquivo)
cat /home/ec2-user/meu-app-relatorios/meu-app-relatorios/.env

# Configuração correta:
# BACKEND_PORT=5001
# BACKEND_HOST=127.0.0.1
# FRONTEND_PORT=3001
# JWT_SECRET=...
# MONGODB_URI=...
# (NÃO incluir NODE_ENV no .env)
```

### Testar Endpoints do Backend

```bash
# Health check
curl http://127.0.0.1:5001/api/health

# Informações de versão (mostra commit, porta, uptime, MongoDB status)
curl http://127.0.0.1:5001/api/version

# Readiness check (200 se MongoDB conectado, 503 se não)
curl http://127.0.0.1:5001/api/readiness
```

### Verificar Proxy do Frontend

```bash
# Testar se o frontend está proxying corretamente para o backend
curl http://127.0.0.1:3001/api/health
```

### Ver Logs de Startup

```bash
# Ver linha de STARTUP nos logs
pm2 logs relatorios-backend --lines 100 | grep STARTUP

# Deve mostrar algo como:
# [STARTUP] Backend server configuration:
#   envFileLoaded: /home/ec2-user/meu-app-relatorios/meu-app-relatorios/.env
#   cwd: /home/ec2-user/meu-app-relatorios/meu-app-relatorios
#   backendPort: 5001
#   commit: abc1234
```

### Após Deploy - Checklist de Validação

```bash
# 1. Backend está respondendo
curl http://127.0.0.1:5001/api/readiness
# Esperado: {"success":true,"message":"Server is ready","mongo":"connected"}

# 2. Frontend está respondendo
curl http://127.0.0.1:3001/api/health
# Esperado: resposta JSON via proxy

# 3. Verificar porta no log
pm2 logs relatorios-backend --lines 50 | grep "Server running"
# Esperado: Server running on http://0.0.0.0:5001 ou http://127.0.0.1:5001

# 4. Verificar commit no log (se configurado)
pm2 logs relatorios-backend --lines 50 | grep "commit:"
```

## 🌐 Acessar Aplicação

Após o deploy, acesse:

- **Frontend:** `http://SEU_IP_EC2:3001`
- **Backend API:** `http://SEU_IP_EC2:5001/api`

## 🔐 Contas de Teste

- **Admin:** admin@teste.com / admin123
- **Gerente:** manager@teste.com / manager123
- **Usuário:** user@teste.com / user123

## ❗ Solução de Problemas

### Erro de versão do Node.js
```bash
# Verificar versão atual
node --version

# Se for menor que 20.19, atualizar:
nvm install 20
nvm use 20
nvm alias default 20
```

### Erro de permissões
```bash
sudo chown -R ec2-user:ec2-user /home/ec2-user/meu-app-relatorios
```

### Erro de MongoDB
```bash
# Se usando MongoDB local, verificar se está rodando:
sudo systemctl status mongod
sudo systemctl start mongod
```

### Erro de build do Vite
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run client:build
```

## 💡 Dicas

1. **Use MongoDB Atlas** para produção (mais confiável)
2. **Configure um domínio** com Nginx para produção
3. **Use SSL/HTTPS** com Let's Encrypt
4. **Monitore recursos** com `pm2 monit`
5. **Faça backups** regulares do banco de dados