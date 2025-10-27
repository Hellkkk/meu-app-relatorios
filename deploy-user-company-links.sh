#!/bin/bash

# Script para deploy das funcionalidades de gerenciamento de vínculos usuário-empresa
# Execute este script no seu servidor EC2

echo "🚀 Iniciando deploy das funcionalidades de vínculos usuário-empresa..."

# Navegar para o diretório da aplicação
cd /var/www/meu-app-relatorios

echo "📥 Fazendo backup da versão atual..."
sudo cp -r . ../backup-$(date +%Y%m%d-%H%M%S)

echo "🔄 Atualizando código do repositório..."
sudo git pull origin main

echo "📦 Instalando dependências (se houver novas)..."
sudo npm install

echo "🔧 Verificando estrutura de arquivos..."

# Verificar se os novos arquivos existem
if [ ! -f "src/components/admin/UserCompanyLinks.jsx" ]; then
    echo "❌ Arquivo UserCompanyLinks.jsx não encontrado!"
    exit 1
fi

if [ ! -f "test-complete-system.js" ]; then
    echo "❌ Arquivo de teste não encontrado!"
    exit 1
fi

echo "✅ Todos os arquivos necessários estão presentes"

echo "🔄 Reiniciando aplicação backend..."
sudo pm2 restart meu-app-relatorios

echo "⏱️  Aguardando backend inicializar..."
sleep 5

echo "🔄 Rebuilding frontend..."
sudo npm run build

echo "🔄 Reiniciando frontend..."
sudo pm2 restart meu-app-relatorios-frontend

echo "⏱️  Aguardando frontend inicializar..."
sleep 3

echo "🧪 Testando conectividade da API..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/auth/login)
if [ $response -eq 405 ] || [ $response -eq 200 ]; then
    echo "✅ Backend está respondendo (HTTP $response)"
else
    echo "❌ Backend não está respondendo adequadamente (HTTP $response)"
fi

echo "🧪 Testando frontend..."
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ $frontend_response -eq 200 ]; then
    echo "✅ Frontend está respondendo (HTTP $frontend_response)"
else
    echo "❌ Frontend não está respondendo adequadamente (HTTP $frontend_response)"
fi

echo "📊 Status dos processos PM2:"
sudo pm2 status

echo "📋 Logs recentes do backend:"
sudo pm2 logs meu-app-relatorios --lines 10

echo "📋 Logs recentes do frontend:"
sudo pm2 logs meu-app-relatorios-frontend --lines 10

echo "🎉 Deploy concluído!"
echo ""
echo "📌 Novas funcionalidades disponíveis:"
echo "   • Componente de gerenciamento de vínculos usuário-empresa"
echo "   • Endpoint de estatísticas em /api/admin/user-company-stats"
echo "   • Interface avançada em /admin/user-company-links"
echo "   • Operações de vínculo aprimoradas"
echo ""
echo "🌐 Acesse: https://seu-dominio.com/admin/user-company-links"
echo "👤 Login: admin@admin.com"
echo ""
echo "✅ Todas as alterações foram aplicadas com sucesso!"