#!/bin/bash

# Script de Deploy para Amazon Linux EC2
# Execute este script na sua instância EC2

echo "🚀 Iniciando deploy do App Relatórios no Amazon Linux..."

# Navegar para o diretório do projeto
cd /home/ec2-user/meu-app-relatorios

# Atualizar código (se usando git)
echo "📥 Atualizando código..."
git pull origin main

# Instalar dependências do backend
echo "📦 Instalando dependências do backend..."
npm install --production

# Instalar dependências do frontend
echo "📦 Instalando dependências do frontend..."
npm install

# Build do frontend
echo "🏗️ Fazendo build do frontend..."
npm run client:build

# Copiar arquivo de ambiente
cp .env.production .env

# Executar seed (se necessário)
echo "🌱 Executando seed do banco..."
node seed.js

# Parar processos existentes
echo "⏹️ Parando processos existentes..."
pm2 delete all 2>/dev/null || true

# Iniciar serviços com PM2 usando arquivo de configuração
echo "🚀 Iniciando serviços com PM2..."
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save
pm2 startup

echo "✅ Deploy concluído!"
echo "🌐 Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001"
echo "🔧 Backend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5001"
echo ""
echo "📊 Status dos serviços:"
pm2 status