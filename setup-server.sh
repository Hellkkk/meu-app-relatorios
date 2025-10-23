#!/bin/bash

# Script de configuração inicial do servidor EC2
# Execute este script APENAS na primeira configuração

echo "🛠️ Configurando servidor EC2 para App Relatórios..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
echo "📦 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# Instalar Git
echo "📦 Instalando Git..."
sudo apt install git -y

# Instalar Nginx (opcional)
echo "📦 Instalando Nginx..."
sudo apt install nginx -y

# Configurar firewall
echo "🔥 Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 5000
sudo ufw --force enable

# Instalar MongoDB (se não usar Atlas)
echo "📦 Instalando MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Clonar repositório
echo "📥 Clonando repositório..."
cd /home/ubuntu
git clone https://github.com/Hellkkk/meu-app-relatorios.git
cd meu-app-relatorios

# Tornar scripts executáveis
chmod +x deploy.sh

# Configurar Nginx (se necessário)
if [ -f nginx.conf ]; then
    echo "🌐 Configurando Nginx..."
    sudo cp nginx.conf /etc/nginx/sites-available/meu-app-relatorios
    sudo ln -s /etc/nginx/sites-available/meu-app-relatorios /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl restart nginx
fi

echo "✅ Configuração inicial concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o arquivo .env com suas credenciais"
echo "2. Execute: npm run deploy"
echo "3. Configure seu Security Group para abrir as portas necessárias"
echo ""
echo "🔑 Portas necessárias no Security Group:"
echo "- 22 (SSH)"
echo "- 80 (HTTP)"
echo "- 443 (HTTPS)"
echo "- 3000 (Frontend)"
echo "- 5000 (Backend)"