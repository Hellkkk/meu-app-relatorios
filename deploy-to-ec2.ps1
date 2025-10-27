# Script PowerShell para fazer deploy das alterações no EC2
# Execute este script no seu computador local

Write-Host "🚀 Iniciando processo de deploy para EC2..." -ForegroundColor Green
Write-Host ""

# Verificar se estamos no diretório correto
$currentPath = Get-Location
Write-Host "📁 Diretório atual: $currentPath" -ForegroundColor Yellow

# Verificar se é o diretório correto
if (-not (Test-Path "server.js")) {
    Write-Host "❌ Erro: Não foi encontrado o arquivo server.js" -ForegroundColor Red
    Write-Host "   Certifique-se de estar no diretório correto do projeto" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Diretório correto confirmado" -ForegroundColor Green

# Verificar status do Git
Write-Host ""
Write-Host "📊 Verificando status do repositório..." -ForegroundColor Yellow
git status

Write-Host ""
$confirm = Read-Host "Deseja continuar com o commit e push? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "❌ Deploy cancelado pelo usuário" -ForegroundColor Red
    exit 0
}

# Adicionar todas as alterações
Write-Host ""
Write-Host "📦 Adicionando alterações ao Git..." -ForegroundColor Yellow
git add .

# Commit das alterações
$commitMessage = "feat: Sistema avançado de gerenciamento de vínculos usuário-empresa

- Novo componente UserCompanyLinks.jsx com interface completa
- Endpoint de estatísticas de vínculos (/api/admin/user-company-stats)  
- Operações CRUD para vínculos usuário-empresa
- Dashboard com métricas e filtros avançados
- Detecção e correção de inconsistências
- Rota /admin/user-company-links no navbar
- Scripts de teste e deploy automatizados"

Write-Host "💾 Fazendo commit das alterações..." -ForegroundColor Yellow
git commit -m $commitMessage

# Push para o repositório
Write-Host "☁️  Enviando alterações para o repositório..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro durante o push" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Agora execute no seu servidor EC2:" -ForegroundColor Cyan
Write-Host ""
Write-Host "ssh -i sua-chave.pem ubuntu@seu-servidor-ec2" -ForegroundColor White
Write-Host "cd /var/www/meu-app-relatorios" -ForegroundColor White
Write-Host "chmod +x deploy-user-company-links.sh" -ForegroundColor White
Write-Host "./deploy-user-company-links.sh" -ForegroundColor White
Write-Host ""

Write-Host "📋 Resumo das alterações enviadas:" -ForegroundColor Yellow
Write-Host "✅ Componente UserCompanyLinks.jsx - Interface completa de gerenciamento"
Write-Host "✅ Endpoint /api/admin/user-company-stats - Estatísticas do sistema"
Write-Host "✅ Rota /admin/user-company-links - Acesso via navbar"
Write-Host "✅ Operações CRUD aprimoradas para vínculos"
Write-Host "✅ Scripts de teste e deploy"
Write-Host ""

Write-Host "🌐 Após o deploy, acesse:" -ForegroundColor Green
Write-Host "   https://seu-dominio.com/admin/user-company-links" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Processo local concluído! Execute o script no EC2 para finalizar." -ForegroundColor Green