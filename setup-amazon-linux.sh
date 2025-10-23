#!/bin/bash

# Script de configuração inicial para Amazon Linux EC2
# Execute este script APENAS na primeira configuração

echo "🛠️ Configurando Amazon Linux EC2 para App Relatórios..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
sudo yum update -y

# Instalar Node.js (Amazon Linux 2)
echo "📦 Instalando Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# Instalar PM2
echo "📦 Instalando PM2..."
npm install -g pm2

# Instalar Git (já vem instalado no Amazon Linux)
echo "✅ Git já está instalado"

# Instalar nginx (opcional)
echo "📦 Instalando nginx..."
sudo amazon-linux-extras install nginx1 -y

# Instalar MongoDB (Amazon Linux)
echo "📦 Configurando MongoDB..."
sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo <<EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

sudo yum install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Clonar repositório
echo "📥 Clonando repositório..."
cd /home/ec2-user
git clone https://github.com/Hellkkk/meu-app-relatorios.git
cd meu-app-relatorios

# Configurar permissões
sudo chown -R ec2-user:ec2-user /home/ec2-user/meu-app-relatorios

# Tornar scripts executáveis
chmod +x deploy-amazon-linux.sh

echo "✅ Configuração inicial concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Execute: source ~/.bashrc"
echo "2. Configure o arquivo .env: cp .env.production .env && nano .env"
echo "3. Execute: npm run deploy:amazon"
echo "4. Configure seu Security Group para abrir as portas necessárias"
echo ""
echo "🔑 Portas necessárias no Security Group:"
echo "- 22 (SSH)"
echo "- 80 (HTTP)"
echo "- 443 (HTTPS)"
echo "- 3000 (Frontend)"
echo "- 5000 (Backend)"