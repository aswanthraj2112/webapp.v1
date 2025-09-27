# 🚀 Deployment Guide

## Current Build Configuration

### 🌐 **Domain Setup**
- **Primary Domain**: `n11817143-videoapp.cab432.com`
- **DNS**: Route53 CNAME → `ec2-54-252-253-142.ap-southeast-2.compute.amazonaws.com`
- **Frontend URL**: http://n11817143-videoapp.cab432.com:3000
- **Backend API**: http://n11817143-videoapp.cab432.com:8080/api

### 🔧 **Current Configuration**

#### Server Environment
```bash
PORT=8080
JWT_SECRET=change_me_in_production
CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com:3000
USE_LOCAL_STORAGE=true
LIMIT_FILE_SIZE_MB=512
AWS_REGION=ap-southeast-2
```

#### Client Environment
```bash
VITE_API_URL=http://n11817143-videoapp.cab432.com:8080/api
VITE_AWS_REGION=ap-southeast-2
```

## 🚀 **Deployment Options**

### Option 1: Direct Deployment (Current)
```bash
# Start application
cd /home/ubuntu/my-node-server/webapp.v1
./start-app.sh

# Or background mode
nohup npm run dev > app.log 2>&1 &
```

### Option 2: Docker Deployment
```bash
# Build and run with Docker
docker-compose up --build -d

# View logs
docker-compose logs -f
```

### Option 3: Production Deployment
```bash
# Build frontend for production
cd client && npm run build

# Start backend in production mode
cd ../server && npm start

# Serve frontend with nginx (recommended)
# Configure nginx to serve build files and proxy API calls
```

## 🏗️ **Infrastructure Requirements**

### System Dependencies
```bash
# Install Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt update && sudo apt install -y ffmpeg

# Verify installations
node --version    # Should be v22.20.0+
ffmpeg -version   # Should show FFmpeg version
```

### Port Configuration
- **Frontend**: 3000 (development) / 80 (production)
- **Backend**: 8080
- **Database**: SQLite (file-based)

### Security Considerations
```bash
# Change JWT secret in production
JWT_SECRET=your-secure-random-secret-here

# Configure firewall (if needed)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # Frontend (dev)
sudo ufw allow 8080  # Backend
sudo ufw enable
```

## 🔄 **CI/CD Pipeline (Recommended)**

### GitHub Actions Example
```yaml
name: Deploy Video App
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          
      - name: Install dependencies
        run: npm run install:all
        
      - name: Build client
        run: cd client && npm run build
        
      - name: Deploy to EC2
        run: |
          # SSH and deploy steps
          rsync -av . user@server:/path/to/app
          ssh user@server 'cd /path/to/app && pm2 restart all'
```

## 📊 **Monitoring & Maintenance**

### Health Checks
```bash
# API health check
curl http://n11817143-videoapp.cab432.com:8080/api/health

# Application status
./test-app.sh
```

### Logs
```bash
# Application logs
tail -f app.log

# Docker logs
docker-compose logs -f

# System logs
journalctl -u your-app-service -f
```

### Backup Strategy
```bash
# Backup database
cp server/data.sqlite backups/data-$(date +%Y%m%d).sqlite

# Backup uploaded files
tar -czf backups/uploads-$(date +%Y%m%d).tar.gz server/src/public/
```

## 🔧 **Environment Variables Reference**

### Server (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `CLIENT_ORIGINS` | Allowed CORS origins | `http://domain:3000` |
| `DB_FILE` | SQLite database path | `./data.sqlite` |
| `USE_LOCAL_STORAGE` | Use local file storage | `true` |
| `LIMIT_FILE_SIZE_MB` | Max upload size | `512` |
| `AWS_REGION` | AWS region | `ap-southeast-2` |

### Client (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://domain:8080/api` |
| `VITE_AWS_REGION` | AWS region | `ap-southeast-2` |

## 🛠️ **Troubleshooting**

### Common Issues
1. **CORS Errors**: Verify `CLIENT_ORIGINS` includes correct port
2. **API Connection**: Check backend is running on correct port
3. **File Upload**: Ensure FFmpeg is installed
4. **Database**: Run `npm run init-db` if tables missing

### Performance Optimization
- Enable gzip compression
- Use nginx for static file serving
- Implement video streaming optimization
- Add database indexing for large datasets

## 📈 **Scaling Considerations**

### Horizontal Scaling
- Load balancer for multiple backend instances
- Shared file storage (S3, NFS)
- Database clustering (PostgreSQL)

### Vertical Scaling
- Increase server resources
- Optimize FFmpeg settings
- Implement caching strategy