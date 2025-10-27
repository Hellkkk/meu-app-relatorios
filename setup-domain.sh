#!/bin/bash

# Script para configurar domínio personalizado
echo "🌐 Configurando domínio personalizado para a aplicação..."

# Solicitar informações do usuário
read -p "Digite seu domínio (ex: meuapp.com): " DOMAIN
read -p "Digite o subdomínio (ex: app ou deixe vazio): " SUBDOMAIN

if [ ! -z "$SUBDOMAIN" ]; then
    FULL_DOMAIN="$SUBDOMAIN.$DOMAIN"
else
    FULL_DOMAIN="$DOMAIN"
fi

echo "🔧 Configurando para: $FULL_DOMAIN"

# Atualizar arquivo .env
cat > .env << EOF
NODE_ENV=production
PORT=5001

# MongoDB Atlas
MONGODB_URI=mongodb+srv://ti_pradum:pradum%40123@cluster0.xlbrnme.mongodb.net/webapp?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret
JWT_SECRET=sua_chave_secreta_super_segura_aqui_123456789

# URLs com domínio personalizado
CLIENT_URL=https://$FULL_DOMAIN
CORS_ORIGIN=https://$FULL_DOMAIN
DOMAIN=$FULL_DOMAIN

# Log level
LOG_LEVEL=info
EOF

echo "✅ Arquivo .env atualizado com domínio: $FULL_DOMAIN"

# Atualizar proxy para suportar HTTPS
cat > proxy-domain.js << 'EOF'
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

console.log('🚀 Starting DOMAIN proxy server...');

// Middleware para parsing JSON
app.use(express.json());

// Middleware para forçar HTTPS em produção
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Middleware de log
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl || req.url} from ${req.ip}`);
  next();
});

// Proxy para API
app.use('/api/*', async (req, res) => {
  try {
    const targetUrl = `http://127.0.0.1:5001${req.originalUrl}`;
    console.log(`🔄 API proxy: ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'X-Forwarded-For': req.ip,
        'X-Real-IP': req.ip
      }
    });
    
    console.log(`✅ Response: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`❌ Proxy error:`, error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Proxy error', message: error.message });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    proxy: 'DOMAIN',
    domain: process.env.DOMAIN || 'localhost',
    timestamp: new Date().toISOString()
  });
});

// Arquivos estáticos com cache headers
app.use(express.static('dist', {
  maxAge: '1d',
  etag: false
}));

// SPA fallback
app.get('*', (req, res) => {
  console.log(`📄 SPA: ${req.originalUrl}`);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar na porta 80 para HTTP ou 3001 para desenvolvimento
const PORT = process.env.NODE_ENV === 'production' ? 80 : 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ DOMAIN Proxy server running on port ${PORT}`);
  console.log(`🌐 Domain: ${process.env.DOMAIN || 'localhost'}`);
});
EOF

echo "✅ Proxy configurado para domínio"

# Criar configuração Nginx para HTTPS (opcional)
cat > nginx-domain.conf << EOF
server {
    listen 80;
    server_name $FULL_DOMAIN;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name $FULL_DOMAIN;
    
    # Certificados SSL (configurar após obter certificados)
    # ssl_certificate /etc/ssl/certs/$FULL_DOMAIN.crt;
    # ssl_certificate_key /etc/ssl/private/$FULL_DOMAIN.key;
    
    # Proxy para aplicação
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "✅ Configuração Nginx criada"

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Configure seu domínio para apontar para o IP da EC2"
echo "2. Abra as portas 80 e 443 no Security Group"
echo "3. Execute: sudo ./install-nginx-ssl.sh"
echo "4. Reinicie a aplicação: pm2 restart all"
echo ""
echo "📋 Configurações criadas:"
echo "- .env (com domínio $FULL_DOMAIN)"
echo "- proxy-domain.js (proxy com suporte a domínio)"
echo "- nginx-domain.conf (configuração Nginx)"

EOF