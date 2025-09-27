# Video Web App

A full-stack video management web application with Express/SQLite backend and React (Vite) frontend. Upload videos, generate thumbnails, trigger FFmpeg transcodes, and stream securely via JWT authentication.

🌐 **Live Application**: http://n11817143-videoapp.cab432.com:3000
🔧 **API Endpoint**: http://n11817143-videoapp.cab432.com:8080/api

## Prerequisites
- Node.js 22.20.0+
- npm 10+
- [FFmpeg](https://ffmpeg.org/) installed and available on your `PATH`
- Domain: `n11817143-videoapp.cab432.com` (Route53 configured)

## Quick Start

### 🚀 **Easy Start (Recommended)**
```bash
# Clone and navigate to project
cd /home/ubuntu/my-node-server/webapp.v1

# Install all dependencies
npm run install:all

# Initialize database
cd server && npm run init-db && cd ..

# Start application
./start-app.sh
```

### 📋 **Manual Setup**
1. **Install all dependencies**
   ```bash
   npm run install:all
   ```

2. **Install system dependencies**
   ```bash
   sudo apt update && sudo apt install -y ffmpeg
   ```

3. **Initialize database**
   ```bash
   cd server && npm run init-db
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

The application runs on:
- **Frontend**: http://n11817143-videoapp.cab432.com:3000
- **Backend**: http://n11817143-videoapp.cab432.com:8080

## Running with Docker

### 🐳 **Development with Docker**
```bash
# Build and run with current domain configuration
docker-compose up --build
```

**Access URLs:**
- Frontend → http://n11817143-videoapp.cab432.com:3000
- Backend API → http://n11817143-videoapp.cab432.com:8080/api
- Health Check → http://n11817143-videoapp.cab432.com:8080/api/health

### 🔧 **Docker Configuration**
The `docker-compose.yml` is configured for:
- **Domain**: `n11817143-videoapp.cab432.com`
- **Backend Port**: 8080
- **Frontend Port**: 3000 (mapped to 80 in container)
- **CORS**: Properly configured for domain access

## Deploying to AWS

1. Create ECR repos for video-webapp-backend and video-webapp-frontend.

2. Build, tag, and push images:
```bash
docker build -t video-webapp-backend ./server
docker tag video-webapp-backend:latest <acct-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-backend:latest
docker push <acct-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-backend:latest

docker build -t video-webapp-frontend ./client
docker tag video-webapp-frontend:latest <acct-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-frontend:latest
docker push <acct-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-frontend:latest
```

3. On EC2, pull and run:
```bash
docker pull <acct-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-backend:latest
docker run -d -p 8080:8080 video-webapp-backend

docker pull <acct-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-frontend:latest
docker run -d -p 80:80 video-webapp-frontend

```
Now app is live at `http://<ec2-public-ip>`.


---

### What To Do Next

1. Copy these files into your repo.  
2. Test locally with `docker-compose up`.  
3. Push both images to AWS ECR.  
4. Run them on EC2.  

---

## Usage
- Register a user via `POST /api/auth/register` or the UI login form.
- Upload a video from the dashboard. The server probes metadata, stores the original file under `server/src/public/videos`, and generates a thumbnail in `server/src/public/thumbs`.
- Trigger a transcode to 720p (H.264/AAC) from the dashboard. Progress is reflected in the video status (`uploaded → transcoding → ready`).
- Stream or download originals/transcodes directly in the dashboard via the secure `/stream` endpoint.

## Environment Configuration

### 📁 **Server Environment (`.env`)**
```bash
PORT=8080
JWT_SECRET=change_me_in_production
TOKEN_EXPIRY=1h
DB_FILE=./data.sqlite
PUBLIC_DIR=./src/public
CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com:3000
LIMIT_FILE_SIZE_MB=512
AWS_REGION=ap-southeast-2
USE_LOCAL_STORAGE=true
```

### 🌐 **Client Environment (`.env`)**
```bash
VITE_API_URL=http://n11817143-videoapp.cab432.com:8080/api
VITE_AWS_REGION=ap-southeast-2
```

## Troubleshooting
| Issue | Fix |
|-------|-----|
| `ffmpeg` not found | Install: `sudo apt update && sudo apt install -y ffmpeg` |
| CORS errors in browser | Ensure `CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com:3000` in `server/.env` |
| API connection failed | Verify backend is running on port 8080 and accessible via domain |
| File upload limits | Adjust `LIMIT_FILE_SIZE_MB=512` in `server/.env` |
| Database missing tables | Run `cd server && npm run init-db` |
| Application won't start | Run `./start-app.sh` or check logs with `tail -f app.log` |

## File Storage Layout
```
server/src/public/
  videos/   # original and transcoded mp4 files
  thumbs/   # generated thumbnails (.jpg)
```

Backups are as simple as copying the SQLite file (`server/data.sqlite` by default) and the `public/` directory.

## Testing Users
Create accounts directly via the UI login form (switch to Register tab) or issue a `POST /api/auth/register` call with `{ "username": "demo", "password": "demo123" }`.

## 🛠️ **Available Scripts**

### Root Directory
- `npm run dev` - Start both backend and frontend concurrently
- `npm run install:all` - Install dependencies for both server and client
- `./start-app.sh` - Easy application startup script
- `./test-app.sh` - Comprehensive testing suite

### Server Directory (`/server`)
- `npm run dev` - Start Express server with nodemon (auto-reload)
- `npm run start` - Start production server
- `npm run init-db` - Initialize SQLite database
- `npm run lint` - Run ESLint for code quality

### Client Directory (`/client`)
- `npm run dev` - Start Vite development server
- `npm run build` - Build production-ready assets
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint for React code

## ✅ **Current Features**
- 🔐 **JWT Authentication** - Secure user registration and login
- 📹 **Video Upload** - Multi-part file upload with validation
- 🎬 **Video Processing** - FFmpeg integration for thumbnails and transcoding
- 📱 **Responsive UI** - React-based frontend with modern design
- 🔄 **Real-time Updates** - Live video processing status
- 🌐 **Domain Integration** - Configured for `n11817143-videoapp.cab432.com`
- 📡 **CORS Support** - Proper cross-origin resource sharing
- 💾 **Local Storage** - SQLite database with file system storage
- 🐳 **Docker Ready** - Complete containerization support

## 🧪 **Testing**
Run comprehensive tests:
```bash
./test-app.sh
```

This tests:
- DNS resolution
- API endpoints
- CORS configuration
- File system setup
- Process status
- System dependencies

## 

To change your web app to transcode videos into 1080p instead of 720p, you need to update the ffmpeg command in your backend code to use 1080p settings.

In your project, the relevant code is likely in server/src/videos/video.service.js. Look for where ffmpeg is called to transcode videos (it may use .size('1280x720') or similar for 720p).

Change the resolution to 1920x1080 for 1080p. For example:



The transcoding resolution is set by the ffmpeg option:

```bash

'-vf scale=1280:-2',

```

This means the video is scaled to 1280 pixels wide (720p). To transcode to 1080p, change this line to:

```bash

'-vf scale=1920:-2',

```

This will scale the video to 1920 pixels wide (1080p).

