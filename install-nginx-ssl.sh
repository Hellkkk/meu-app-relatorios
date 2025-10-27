#!/bin/bash

# Script para instalar Nginx e configurar SSL
echo "🔧 Instalando Nginx e configurando SSL..."

# Atualizar sistema
sudo yum update -y

# Instalar Nginx
sudo amazon-linux-extras install nginx1 -y

# Instalar Certbot para SSL gratuito
sudo yum install certbot python3-certbot-nginx -y

# Ler domínio do arquivo .env
DOMAIN=$(grep DOMAIN= .env | cut -d'=' -f2)

if [ -z "$DOMAIN" ]; then
    echo "❌ Domínio não encontrado no .env"
    exit 1
fi

echo "🌐 Configurando SSL para: $DOMAIN"

# Copiar configuração Nginx
sudo cp nginx-domain.conf /etc/nginx/conf.d/app.conf

# Testar configuração Nginx
sudo nginx -t

if [ $? -eq 0 ]; then
    # Iniciar Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    echo "✅ Nginx instalado e iniciado"
    
    # Configurar certificado SSL
    echo "🔐 Configurando certificado SSL..."
    sudo certbot --nginx -d $DOMAIN --agree-tos --no-eff-email --email admin@$DOMAIN
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL configurado com sucesso!"
        
        # Configurar renovação automática
        sudo crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -
        
        echo "✅ Renovação automática configurada"
    else
        echo "⚠️ Erro ao configurar SSL. Verifique se o domínio está apontando para esta EC2"
    fi
else
    echo "❌ Erro na configuração do Nginx"
fi

echo ""
echo "🎯 CONFIGURAÇÃO COMPLETA!"
echo "🌐 Sua aplicação estará disponível em: https://$DOMAIN"
echo ""
echo "📋 Para finalizar:"
echo "1. Reinicie a aplicação: pm2 restart all"
echo "2. Abra as portas no Security Group:"
echo "   - Porta 80 (HTTP)"
echo "   - Porta 443 (HTTPS)"
echo "3. Teste: curl https://$DOMAIN/health"