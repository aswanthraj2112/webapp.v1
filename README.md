# 🎬 Clean Video App

A clean, production-ready video sharing application with React frontend and Node.js backend, integrated with AWS DynamoDB.

## 🚀 Quick Deployment

```bash
./deploy-now.sh
```

**One command does everything:**
- Cleans existing containers
- Builds fresh images if needed
- Deploys with optimal settings
- Tests the deployment
- Provides working URLs

## 🏗️ Architecture

- **Frontend**: React + Vite (Port 3000)
- **Backend**: Node.js/Express (Port 8080)
- **Database**: AWS DynamoDB
- **Storage**: Local filesystem (S3-ready)
- **Auth**: JWT-based authentication

## 🔧 Development

```bash
# Clean development setup
./dev.sh

# Or manual setup
npm install && cd client && npm install && cd ../server && npm install && cd ..
docker-compose up --build
```

## 📁 Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
├── docs/            # Documentation
├── cleanup.sh       # Workspace cleanup
├── deploy-now.sh    # One-command deployment
├── dev.sh          # Development setup
└── docker-compose.yml
```

## 🌐 Access URLs

- **Frontend**: http://n11817143-videoapp.cab432.com:3000
- **Backend**: http://n11817143-videoapp.cab432.com:8080
- **Health Check**: http://n11817143-videoapp.cab432.com:8080/api/health

## ✨ Features

- 📹 Video upload & streaming
- 🔐 JWT authentication
- 🖼️ Automatic thumbnail generation
- 🗄️ DynamoDB persistence
- 📱 Responsive UI
- ⚡ Health monitoring
- 🧹 Clean development workflow

## 🛠️ Maintenance

```bash
# Clean workspace
./cleanup.sh

# View logs
docker logs videoapp-production

# Stop deployment
docker stop videoapp-production
```

## 📚 Documentation

Detailed documentation is available in the `docs/` folder:
- AWS integration guides
- Deployment strategies  
- Configuration options
- Troubleshooting guides

## 🏃‍♂️ Getting Started

1. **Deploy**: `./deploy-now.sh`
2. **Develop**: `./dev.sh`  
3. **Clean**: `./cleanup.sh`

That's it! Your video app is ready to go. 🎉