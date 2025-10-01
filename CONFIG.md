# 📋 Configuration Overview

## 🌐 **Application URLs**
- **Frontend**: http://n11817143-videoapp.cab432.com:3000
- **Backend API**: http://n11817143-videoapp.cab432.com:8080/api
- **Health Check**: http://n11817143-videoapp.cab432.com:8080/api/health

## 📁 **Project Structure**
```
webapp.v1/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Page components
│   │   └── api.js             # API client
│   ├── .env                   # Client environment
│   ├── vite.config.js         # Vite configuration
│   └── package.json           # Client dependencies
├── server/                     # Express backend
│   ├── src/
│   │   ├── auth/              # Authentication routes
│   │   ├── videos/            # Video management
│   │   ├── public/            # Static files
│   │   │   ├── videos/        # Uploaded videos
│   │   │   └── thumbs/        # Generated thumbnails
│   │   └── index.js           # Server entry point
│   ├── .env                   # Server environment
│   ├── data.sqlite            # SQLite database
│   └── package.json           # Server dependencies
├── docker-compose.yml         # Docker configuration
├── start-app.sh              # Quick start script
├── test-app.sh               # Testing script
├── README.md                  # Documentation
├── DEPLOYMENT.md             # Deployment guide
└── package.json               # Root package.json
```

## 🔧 **Environment Configuration**

### Server Environment (server/.env)
```bash
# Network Configuration
PORT=8080
CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com:3000

# Security
JWT_SECRET=change_me_in_production
TOKEN_EXPIRY=1h

# Database
DB_FILE=./data.sqlite

# File Storage
PUBLIC_DIR=./src/public
USE_LOCAL_STORAGE=true
LIMIT_FILE_SIZE_MB=512

# AWS (for future cloud features)
AWS_REGION=ap-southeast-2
```

### Client Environment (client/.env)
```bash
# API Configuration
VITE_API_URL=http://n11817143-videoapp.cab432.com:8080/api

# AWS Configuration
VITE_AWS_REGION=ap-southeast-2
```

## 🐳 **Docker Configuration**

### docker-compose.yml
- **Backend**: Port 8080 → 8080
- **Frontend**: Port 3000 → 3000 (exposed externally)
- **Volumes**: Persistent data and uploads
- **Environment**: Domain-specific configuration

## 🛠️ **Available Scripts**

### Root Level (npm run ...)
| Script | Description |
|--------|-------------|
| `dev` | Start both frontend and backend |
| `start` | Quick start using start-app.sh |
| `install:all` | Install all dependencies |
| `setup` | Complete setup (install + init DB) |
| `build` | Build frontend for production |
| `test` | Run comprehensive tests |
| `health` | Check API health |
| `logs` | View application logs |
| `clean` | Clean all generated files |

### Server Level (cd server && npm run ...)
| Script | Description |
|--------|-------------|
| `dev` | Start with nodemon (auto-reload) |
| `start` | Production server start |
| `init-db` | Initialize SQLite database |
| `lint` | Code quality check |

### Client Level (cd client && npm run ...)
| Script | Description |
|--------|-------------|
| `dev` | Vite development server |
| `build` | Production build |
| `preview` | Preview production build |
| `lint` | Code quality check |

## 🔗 **API Endpoints**

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Videos
- `GET /api/videos` - List videos (paginated)
- `POST /api/videos/upload` - Upload video
- `GET /api/videos/:id` - Get video details
- `DELETE /api/videos/:id` - Delete video
- `GET /api/videos/:id/stream` - Stream video
- `GET /api/videos/:id/thumbnail` - Get thumbnail

### System
- `GET /api/health` - Health check

## 🗄️ **Database Schema**

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Videos Table
```sql
CREATE TABLE videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  videoUid TEXT UNIQUE,
  userId INTEGER NOT NULL,
  originalName TEXT NOT NULL,
  storedFilename TEXT NOT NULL,
  format TEXT,
  durationSec REAL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  width INTEGER,
  height INTEGER,
  sizeBytes INTEGER,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  thumbPath TEXT,
  transcodedFilename TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔒 **Security Features**

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration (1 hour default)

### CORS Configuration
- Domain-specific origins
- Credential support
- Proper preflight handling

### File Upload Security
- File size limits (512MB default)
- MIME type validation
- Secure file naming

## 📊 **Performance Features**

### Video Processing
- FFmpeg integration
- Automatic thumbnail generation
- Video transcoding support
- Streaming with range requests

### Caching
- Static file serving
- ETags for cache validation
- Conditional requests (304 responses)

## 🚀 **Deployment Status**

### Current State: ✅ PRODUCTION READY
- Domain configured: `n11817143-videoapp.cab432.com`
- DNS resolved via Route53
- CORS properly configured
- SSL-ready (can add HTTPS certificates)
- Docker containerization available
- Comprehensive testing suite

### Monitoring
- Health check endpoint
- Application logging
- Error handling and reporting
- Process management ready