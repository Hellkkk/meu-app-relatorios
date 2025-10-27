# Configuração de Domínio para EC2

## 🎯 **Passos para Configurar Domínio**

### **1. Escolher Domínio**
- **Novo domínio**: Route 53 da AWS (~$12/ano)
- **Domínio existente**: GoDaddy, Namecheap, etc.

### **2. Apontar Domínio para EC2**
- Criar registro A apontando para o IP público da EC2
- Exemplo: `app.meudominio.com` → `IP_DA_EC2`

### **3. Configurar Security Group**
No console AWS, adicionar regras:
```
Porta 80  (HTTP)  - 0.0.0.0/0
Porta 443 (HTTPS) - 0.0.0.0/0
Porta 22  (SSH)   - Seu IP
```

### **4. Executar Scripts de Configuração**
```bash
# Na EC2, executar:
git pull origin main
chmod +x setup-domain.sh
chmod +x install-nginx-ssl.sh

# Configurar domínio
./setup-domain.sh

# Instalar Nginx e SSL
sudo ./install-nginx-ssl.sh

# Reiniciar aplicação
pm2 restart all
```

### **5. Testar**
```bash
# Testar HTTPS
curl https://seudominio.com/health

# Acessar aplicação
https://seudominio.com
```

## 🔧 **Opções de Domínio**

### **Route 53 (AWS)**
1. Registrar domínio no Route 53
2. Criar Hosted Zone
3. Criar registro A para IP da EC2

### **Domínio Externo**
1. No painel do seu provedor de domínio
2. Adicionar registro A:
   - Nome: `app` (ou `@` para domínio raiz)
   - Tipo: A
   - Valor: `IP_PUBLICO_EC2`
   - TTL: 300

## 🚀 **Resultado Final**
- **HTTP**: Redireciona para HTTPS
- **HTTPS**: Certificado SSL gratuito (Let's Encrypt)
- **Domínio**: `https://seudominio.com`
- **API**: `https://seudominio.com/api/`

## 🛠️ **Comandos Úteis**
```bash
# Verificar status Nginx
sudo systemctl status nginx

# Logs Nginx
sudo tail -f /var/log/nginx/access.log

# Renovar SSL manualmente
sudo certbot renew

# Verificar certificado
sudo certbot certificates
```