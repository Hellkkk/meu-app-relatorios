#!/bin/bash

# Script para reinicialização completa do sistema
echo "🔄 Reinicialização Completa do Sistema"
echo "====================================="
echo ""

# 1. Parar todos os processos
echo "1. Parando todos os processos PM2..."
sudo pm2 stop all
sudo pm2 delete all
echo ""

# 2. Verificar se as portas estão livres
echo "2. Verificando portas..."
sudo netstat -tlnp | grep -E ':(3001|5001)' && echo "⚠️  Portas ainda em uso" || echo "✅ Portas livres"
echo ""

# 3. Matar processos residuais se necessário
echo "3. Verificando processos residuais..."
sudo pkill -f "node.*server.js" 2>/dev/null || echo "✅ Nenhum processo residual"
sudo pkill -f "node.*frontend-server.js" 2>/dev/null || echo "✅ Nenhum processo residual"
echo ""

# 4. Aguardar liberação das portas
echo "4. Aguardando liberação das portas..."
sleep 5

# 5. Verificar diretório atual
echo "5. Verificando diretório de trabalho..."
pwd
ls -la | grep -E "(server.js|frontend-server.js|ecosystem.config.js)"
echo ""

# 6. Iniciar backend diretamente (teste)
echo "6. Iniciando backend na porta 5001..."
if [ -f ecosystem.config.js ]; then
    sudo pm2 start ecosystem.config.js --only meu-app-relatorios
else
    sudo pm2 start server.js --name meu-app-relatorios
fi
echo ""

# 7. Aguardar backend inicializar
echo "7. Aguardando backend inicializar..."
sleep 3

# 8. Testar backend
echo "8. Testando backend..."
curl -s -w "Status: %{http_code}\n" http://localhost:5001/api/auth/login
echo ""

# 9. Iniciar frontend
echo "9. Iniciando frontend na porta 3001..."
if [ -f ecosystem.config.js ]; then
    sudo pm2 start ecosystem.config.js --only meu-app-relatorios-frontend
else
    sudo pm2 start frontend-server.js --name meu-app-relatorios-frontend
fi
echo ""

# 10. Aguardar frontend inicializar
echo "10. Aguardando frontend inicializar..."
sleep 3

# 11. Testar frontend
echo "11. Testando frontend..."
curl -s -w "Status: %{http_code}\n" http://localhost:3001/
echo ""

# 12. Status final
echo "12. Status final dos processos:"
sudo pm2 status
echo ""

# 13. Verificar portas finais
echo "13. Portas em uso:"
sudo netstat -tlnp | grep -E ':(3001|5001)'
echo ""

# 14. Logs recentes
echo "14. Logs recentes do backend:"
sudo pm2 logs meu-app-relatorios --lines 5
echo ""

echo "🎉 Reinicialização completa!"
echo ""
echo "🌐 Teste o acesso:"
echo "Frontend: http://seu-ip-ec2:3001"
echo "Backend API: http://seu-ip-ec2:5001/api"
echo ""
echo "Se ainda houver problemas, execute o diagnóstico:"
echo "./diagnostico-ec2.sh"