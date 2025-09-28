# Video Web Application - Domain Configuration

## 🌐 Application URLs

### Production URLs (Route53 Domain)
- **Frontend**: http://n11817143-videoapp.cab432.com:3000
- **Backend API**: http://n11817143-videoapp.cab432.com:8080/api
- **Health Check**: http://n11817143-videoapp.cab432.com:8080/api/health

### DNS Configuration
- **Hosted Zone**: `Z02680423BHWEVRU2JZDQ` (`cab432.com`)
- **Subdomain**: `n11817143-videoapp.cab432.com`
- **Type**: `CNAME` → `ec2-54-252-253-142.ap-southeast-2.compute.amazonaws.com`
- **DNS Sync**: ✅ Managed by auto-heal script `check-and-fix-dns.sh`

## 🚀 How to Start the Application

### Method 1: Using the Start Script
```bash
cd /home/ubuntu/my-node-server/webapp.v1
./start-app.sh
```

### Method 2: Manual Start
```bash
cd /home/ubuntu/my-node-server/webapp.v1
npm run dev
```

### Method 3: Background Mode
```bash
cd /home/ubuntu/my-node-server/webapp.v1
nohup npm run dev > app.log 2>&1 &
```

## ⚙️ Configuration Files

### Server Environment (`.env`)
```bash
PORT=8080
JWT_SECRET=change_me_in_production
TOKEN_EXPIRY=1h
DB_FILE=./data.sqlite
PUBLIC_DIR=./src/public
CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com
LIMIT_FILE_SIZE_MB=512
AWS_REGION=ap-southeast-2
USE_LOCAL_STORAGE=true
```

### Client Environment (`.env`)
```bash
VITE_API_URL=http://n11817143-videoapp.cab432.com:8080/api
VITE_AWS_REGION=ap-southeast-2
```

## 🔧 Technical Stack

- **Frontend**: React 18 + Vite (Port 3000)
- **Backend**: Node.js + Express (Port 8080)
- **Database**: SQLite
- **Video Processing**: FFmpeg
- **Authentication**: JWT tokens
- **File Upload**: Multer
- **CORS**: Configured for domain access

## ✅ Features Working

1. **User Authentication**: Login/Registration
2. **Video Upload**: Multi-part upload with FFmpeg processing
3. **Video Listing**: Paginated video gallery
4. **Thumbnail Generation**: Automatic video thumbnails
5. **CORS**: Properly configured for domain access
6. **Database**: SQLite with auto-initialization

## 🧪 Testing

### Backend API Test
```bash
curl http://n11817143-videoapp.cab432.com:8080/api/health
# Expected: {"status":"ok"}
```

### Frontend Test
```bash
curl -I http://n11817143-videoapp.cab432.com:3000
# Expected: HTTP/1.1 200 OK
```

## 📝 Notes

- The application runs on non-standard ports (3000 for frontend, 8080 for backend)
- Both services are configured to listen on all interfaces (0.0.0.0)
- CORS is properly configured to allow domain access
- FFmpeg is installed for video processing
- Database is automatically initialized on first run