#!/bin/bash

# Install Nginx Configuration for App Relatórios
# This script copies the nginx configuration to /etc/nginx/conf.d/ and restarts nginx

set -e

echo "=========================================="
echo "Installing Nginx Configuration"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: This script must be run as root or with sudo"
  echo "Usage: sudo ./scripts/nginx/install-config.sh"
  exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$SCRIPT_DIR/../.."
NGINX_CONF_SOURCE="$REPO_ROOT/nginx/app-relatorios.conf"
NGINX_CONF_DEST="/etc/nginx/conf.d/app-relatorios.conf"

echo "📁 Source: $NGINX_CONF_SOURCE"
echo "📁 Destination: $NGINX_CONF_DEST"
echo ""

# Check if source file exists
if [ ! -f "$NGINX_CONF_SOURCE" ]; then
  echo "❌ Error: Source configuration file not found: $NGINX_CONF_SOURCE"
  exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
  echo "❌ Error: nginx is not installed"
  echo "Install nginx first:"
  echo "  Amazon Linux: sudo yum install nginx"
  echo "  Ubuntu/Debian: sudo apt install nginx"
  exit 1
fi

# Backup existing config if it exists
if [ -f "$NGINX_CONF_DEST" ]; then
  BACKUP_FILE="$NGINX_CONF_DEST.backup.$(date +%Y%m%d_%H%M%S)"
  echo "📦 Backing up existing configuration to: $BACKUP_FILE"
  cp "$NGINX_CONF_DEST" "$BACKUP_FILE"
fi

# Copy configuration file
echo "📋 Copying configuration file..."
cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DEST"
echo "✅ Configuration file copied"
echo ""

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if nginx -t; then
  echo "✅ Nginx configuration is valid"
  echo ""
else
  echo "❌ Error: Nginx configuration test failed"
  echo "The configuration file has been installed but nginx was not restarted."
  echo "Fix the configuration errors and run: sudo systemctl reload nginx"
  exit 1
fi

# Reload nginx
echo "🔄 Reloading nginx..."
if systemctl reload nginx; then
  echo "✅ Nginx reloaded successfully"
else
  echo "⚠️  Warning: Failed to reload nginx"
  echo "Try restarting nginx manually: sudo systemctl restart nginx"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "The app should now be accessible at:"
echo "  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_IP')/"
echo ""
echo "Verify the setup:"
echo "  curl http://localhost/api/health"
echo "  curl http://localhost/"
echo ""
echo "View nginx logs:"
echo "  sudo tail -f /var/log/nginx/app-relatorios.access.log"
echo "  sudo tail -f /var/log/nginx/app-relatorios.error.log"
echo ""
