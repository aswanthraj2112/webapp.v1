#!/bin/bash

# Video Web Application HTTPS Deployment Script
echo "🚀 Video Web Application - HTTPS Deployment"
echo "============================================"

APP_DIR="/home/ubuntu/my-node-server/webapp.v1"
DOMAIN="n11817143-videoapp.cab432.com"

cd "$APP_DIR" || exit 1

case "$1" in
    start)
        echo "🟢 Starting Video Web Application..."
        sudo systemctl start videoapp
        sudo systemctl start nginx
        echo "✅ Application started!"
        echo "🌐 Available at: https://$DOMAIN"
        ;;
    
    stop)
        echo "🛑 Stopping Video Web Application..."
        sudo systemctl stop videoapp
        echo "✅ Application stopped!"
        ;;
    
    restart)
        echo "🔄 Restarting Video Web Application..."
        sudo systemctl restart videoapp
        sudo systemctl restart nginx
        echo "✅ Application restarted!"
        echo "🌐 Available at: https://$DOMAIN"
        ;;
    
    status)
        echo "📊 Application Status:"
        echo "====================="
        echo "🎬 Video App:"
        sudo systemctl is-active videoapp && echo "  ✅ Running" || echo "  ❌ Stopped"
        echo "🌐 Nginx:"
        sudo systemctl is-active nginx && echo "  ✅ Running" || echo "  ❌ Stopped"
        echo ""
        echo "🔐 SSL Certificate:"
        sudo certbot certificates | grep "Expiry Date" || echo "  ❌ No certificate found"
        ;;
    
    logs)
        echo "📋 Application Logs:"
        echo "==================="
        sudo journalctl -u videoapp -f
        ;;
    
    ssl-renew)
        echo "🔐 Renewing SSL Certificate..."
        sudo certbot renew
        sudo systemctl reload nginx
        echo "✅ SSL certificate renewed!"
        ;;
    
    ssl-check)
        echo "🔍 SSL Certificate Status:"
        sudo certbot certificates
        echo ""
        echo "🧪 Testing HTTPS connection:"
        curl -I "https://$DOMAIN" | head -5
        ;;
    
    deploy)
        echo "🚀 Deploying latest changes..."
        git pull origin main
        npm install
        cd client && npm install && npm run build && cd ..
        cd server && npm install && cd ..
        sudo systemctl restart videoapp
        sudo systemctl reload nginx
        echo "✅ Deployment complete!"
        echo "🌐 Available at: https://$DOMAIN"
        ;;
    
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|ssl-renew|ssl-check|deploy}"
        echo ""
        echo "Commands:"
        echo "  start      - Start the application"
        echo "  stop       - Stop the application" 
        echo "  restart    - Restart the application"
        echo "  status     - Show application status"
        echo "  logs       - Show application logs"
        echo "  ssl-renew  - Renew SSL certificate"
        echo "  ssl-check  - Check SSL certificate status"
        echo "  deploy     - Deploy latest changes from git"
        echo ""
        echo "🌐 HTTPS URL: https://$DOMAIN"
        exit 1
        ;;
esac