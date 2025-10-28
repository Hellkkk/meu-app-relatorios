#!/bin/bash

# Script de diagnóstico para problemas de conexão frontend-backend
echo "🔍 Diagnóstico de Conectividade Frontend-Backend"
echo "================================================"
echo ""

# 1. Verificar processos PM2
echo "1. Status dos processos PM2:"
sudo pm2 status
echo ""

# 2. Verificar portas em uso
echo "2. Portas em uso (3001 e 5001):"
sudo netstat -tlnp | grep -E ':(3001|5001)' || echo "Nenhuma porta 3001/5001 encontrada"
echo ""

# 3. Verificar logs do backend
echo "3. Logs recentes do backend (últimas 20 linhas):"
sudo pm2 logs meu-app-relatorios --lines 20
echo ""

# 4. Verificar logs do frontend
echo "4. Logs recentes do frontend (últimas 20 linhas):"
sudo pm2 logs meu-app-relatorios-frontend --lines 20
echo ""

# 5. Testar conectividade local do backend
echo "5. Testando conectividade do backend (porta 5001):"
curl -s -w "Status: %{http_code}\n" http://localhost:5001/api/auth/login || echo "❌ Backend não responde na porta 5001"
echo ""

# 6. Testar conectividade local do frontend
echo "6. Testando conectividade do frontend (porta 3001):"
curl -s -w "Status: %{http_code}\n" http://localhost:3001/ || echo "❌ Frontend não responde na porta 3001"
echo ""

# 7. Verificar arquivo de configuração do PM2
echo "7. Configuração do PM2 (ecosystem.config.js):"
if [ -f ecosystem.config.js ]; then
    cat ecosystem.config.js
else
    echo "❌ Arquivo ecosystem.config.js não encontrado"
fi
echo ""

# 8. Verificar variáveis de ambiente
echo "8. Variáveis de ambiente do backend:"
sudo pm2 env meu-app-relatorios 2>/dev/null || echo "❌ Não foi possível obter env do backend"
echo ""

# 9. Verificar se o backend está realmente rodando
echo "9. Verificando processo do backend:"
ps aux | grep "node.*server.js" | grep -v grep || echo "❌ Processo backend não encontrado"
echo ""

# 10. Verificar se o frontend está realmente rodando  
echo "10. Verificando processo do frontend:"
ps aux | grep "node.*frontend-server.js" | grep -v grep || echo "❌ Processo frontend não encontrado"
echo ""

# 11. Testar curl direto para API
echo "11. Teste direto da API backend:"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123"}' \
  http://localhost:5001/api/auth/login || echo "❌ Falha no teste de login"
echo ""

# 12. Verificar permissões de arquivos
echo "12. Verificando permissões do diretório:"
ls -la /var/www/meu-app-relatorios/ | head -10
echo ""

echo "🏁 Diagnóstico concluído!"
echo ""
echo "📋 Para interpretar os resultados:"
echo "✅ = Funcionando corretamente"
echo "❌ = Problema identificado"
echo ""
echo "Se o backend não estiver na porta 5001, execute:"
echo "sudo pm2 restart meu-app-relatorios"
echo ""
echo "Se o frontend não estiver na porta 3001, execute:"
echo "sudo pm2 restart meu-app-relatorios-frontend"