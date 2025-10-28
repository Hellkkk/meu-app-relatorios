#!/bin/bash

echo "🚀 INICIANDO DEPLOY DA CORREÇÃO DO PROXY..."

# Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# Verificar se o backend está rodando
echo "🔍 Verificando backend..."
if pm2 list | grep -q "backend.*online"; then
    echo "✅ Backend está online"
else
    echo "⚠️ Reiniciando backend..."
    pm2 restart backend
fi

# Parar frontend para aplicar correção
echo "🛑 Parando frontend..."
pm2 stop frontend

# Aguardar um momento
sleep 2

# Reiniciar frontend com nova configuração
echo "🔄 Reiniciando frontend..."
pm2 start frontend

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 5

# Verificar status
echo "📊 Status dos serviços:"
pm2 list

# Testar conectividade
echo "🧪 Testando conectividade..."
curl -f http://localhost:3001/ && echo "✅ Frontend respondendo" || echo "❌ Frontend não responde"
curl -f http://localhost:5001/api/health && echo "✅ Backend respondendo" || echo "❌ Backend não responde"

echo "✅ DEPLOY CONCLUÍDO!"