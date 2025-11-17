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
NODE_ENV=production

# Backend API Server
BACKEND_PORT=5001
BACKEND_HOST=127.0.0.1

# Frontend Proxy Server  
FRONTEND_PORT=3001

# MongoDB Atlas (recomendado)
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/relatorios

# OU MongoDB local
# MONGODB_URI=mongodb://localhost:27017/relatorios

# JWT Secret (gere uma chave forte)
JWT_SECRET=sua_chave_jwt_super_secreta_com_pelo_menos_32_caracteres

# URLs (substitua SEU_IP_EC2 pelo IP público da sua instância)
CLIENT_URL=http://SEU_IP_EC2:3001
CORS_ORIGIN=http://SEU_IP_EC2:3001
```

**Importante**: O sistema agora requer variáveis separadas para backend (`BACKEND_PORT=5001`) e frontend (`FRONTEND_PORT=3001`).

### 3. Deploy da Aplicação

```bash
npm run deploy:amazon
```

### 4. Verificar Deploy

Após o deploy, verifique se ambos os servidores estão rodando:

```bash
# Verificar status do PM2
pm2 status

# Deve mostrar 2 processos:
# - relatorios-backend (port 5001)
# - relatorios-frontend (port 3001)

# Verificar health dos servidores
npm run verify:ports

# Ou manualmente:
curl http://127.0.0.1:5001/api/health  # Backend
curl http://127.0.0.1:3001/api/health  # Frontend proxy -> Backend
curl http://127.0.0.1:3001/health      # Frontend server
```

Se algum servidor não estiver respondendo, verifique os logs:
```bash
pm2 logs relatorios-backend
pm2 logs relatorios-frontend
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

# Iniciar com PM2 usando ecosystem config (RECOMENDADO)
pm2 start ecosystem.config.js

# OU iniciar processos individuais
# pm2 start server.js --name relatorios-backend
# pm2 start frontend-server.js --name relatorios-frontend
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

## 🌐 Acessar Aplicação

Após o deploy, acesse:

- **Frontend:** `http://SEU_IP_EC2:3001`
- **Backend API:** `http://SEU_IP_EC2:5001/api`

## 🔐 Contas de Teste

- **Admin:** admin@teste.com / admin123
- **Gerente:** manager@teste.com / manager123
- **Usuário:** user@teste.com / user123

## ❗ Solução de Problemas

### 🔍 Diagnóstico Rápido

**Não consegue acessar a aplicação?** Execute estes comandos na EC2:

```bash
# 1. Verificar se os processos estão rodando
pm2 status
# Deve mostrar: relatorios-backend (online) e relatorios-frontend (online)

# 2. Testar health checks internamente
curl http://127.0.0.1:5001/api/health  # Backend
curl http://127.0.0.1:3001/health      # Frontend
curl http://127.0.0.1:3001/api/health  # Frontend -> Backend proxy

# 3. Verificar portas abertas
sudo netstat -tlnp | grep -E ':(3001|5001)'
# Deve mostrar ambas as portas com 0.0.0.0 (não 127.0.0.1)

# 4. Testar do seu computador local
curl http://SEU_IP_EC2:3001/health
# Se falhar: problema no Security Group da AWS
# Se funcionar: problema no browser/CORS
```

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

### Erro ECONNREFUSED no login

Se o login falhar com erro `ECONNREFUSED 127.0.0.1:5001` ou você ver **502 Bad Gateway**:

```bash
# 1. Verificar se ambos os processos estão rodando
pm2 status
# Deve mostrar: relatorios-backend e relatorios-frontend

# 2. Verificar health dos servidores
npm run verify:ports

# 3. Testar endpoints manualmente
curl http://127.0.0.1:5001/api/health  # Backend direto
curl http://127.0.0.1:3001/api/health  # Via proxy frontend

# 4. Se o backend não estiver rodando, verificar logs
pm2 logs relatorios-backend --lines 50

# 5. Verificar variáveis de ambiente
cat .env | grep -E "BACKEND_PORT|FRONTEND_PORT"
# Deve mostrar: BACKEND_PORT=5001 e FRONTEND_PORT=3001

# 6. Reiniciar processos
pm2 restart all

# 7. Se ainda não funcionar, iniciar manualmente para ver erros
pm2 delete all
npm run start:api     # Em um terminal
npm run start:web     # Em outro terminal
```

**Nota sobre 502 Bad Gateway**: O frontend proxy retorna HTTP 502 quando o backend não está acessível. Este é o comportamento esperado e facilita o diagnóstico - significa que o frontend está funcionando, mas precisa do backend rodando.

**Causa comum**: O arquivo `.env.production` tinha `PORT=3001` que causava conflito. Agora usa `BACKEND_PORT=5001` e `FRONTEND_PORT=3001` separadamente.

### Porta 3001 não acessível externamente

Se você consegue acessar internamente (`curl http://127.0.0.1:3001`) mas não consegue acessar de fora da EC2:

```bash
# 1. Verificar se o frontend está rodando internamente
curl http://127.0.0.1:3001/health
# Deve retornar: {"success":true,"message":"Frontend proxy server is running",...}

# 2. Verificar se o servidor está escutando em 0.0.0.0 (todas as interfaces)
sudo netstat -tlnp | grep :3001
# Deve mostrar: 0.0.0.0:3001 (não 127.0.0.1:3001)

# 3. Verificar firewall local
sudo iptables -L -n | grep 3001
# Se houver regras DROP ou REJECT, adicionar regra ACCEPT:
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
sudo service iptables save  # Amazon Linux 1
# OU
sudo iptables-save | sudo tee /etc/sysconfig/iptables  # Amazon Linux 2
```

**⚠️ IMPORTANTE: Security Group da AWS**

A causa mais comum é o Security Group da EC2 não ter a porta 3001 aberta. Verifique:

1. Vá para **EC2 Console → Instâncias → Selecione sua instância**
2. Na aba **Segurança**, clique no Security Group
3. Na aba **Regras de entrada**, verifique se há uma regra:
   - **Tipo**: TCP Personalizado
   - **Porta**: 3001
   - **Origem**: 0.0.0.0/0 (ou seu IP específico)
4. Se não houver, clique em **Editar regras de entrada** e adicione:
   - **Tipo**: TCP Personalizado
   - **Intervalo de portas**: 3001
   - **Origem**: 0.0.0.0/0
   - **Descrição**: Frontend React App

**Teste após configurar:**
```bash
# Do seu computador local (substitua SEU_IP_EC2)
curl http://SEU_IP_EC2:3001/health

# Se retornar o JSON do health check, está funcionando!
# Se der timeout, o Security Group ainda não está configurado corretamente
```

## 💡 Dicas

1. **Use MongoDB Atlas** para produção (mais confiável)
2. **Configure um domínio** com Nginx para produção
3. **Use SSL/HTTPS** com Let's Encrypt
4. **Monitore recursos** com `pm2 monit`
5. **Faça backups** regulares do banco de dados
6. **Use `npm run verify:ports`** após cada deploy para confirmar que ambos os servidores estão online