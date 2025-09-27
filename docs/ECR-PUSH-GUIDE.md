# 🐳 ECR Container Push Guide

## 📦 **Container Successfully Built**
✅ **Container Name**: `video-webapp:latest`  
✅ **Tagged As**: `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2:WebApp`  
✅ **Size**: Multi-stage build with Node.js 22, FFmpeg, React frontend + Express backend

## 🚫 **ECR Push Issue**
**Error**: Access denied - IAM role lacks ECR permissions

```
User: arn:aws:sts::901444280953:assumed-role/CAB432-Instance-Role/i-0aaedfc6a70038409 
is not authorized to perform: ecr:InitiateLayerUpload on resource: 
arn:aws:ecr:ap-southeast-2:901444280953:repository/n11817143-a2
```

## 🔐 **Required IAM Permissions**

The EC2 instance role `CAB432-Instance-Role` needs these ECR permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:PutImage",
                "ecr:CreateRepository",
                "ecr:DescribeRepositories"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🛠️ **Solutions**

### Option 1: Add ECR Permissions to IAM Role
1. Go to AWS IAM Console
2. Find role: `CAB432-Instance-Role`
3. Attach policy: `AmazonEC2ContainerRegistryFullAccess`
4. Or create custom policy with permissions above

### Option 2: Use AWS CLI with Different Credentials
```bash
# Configure AWS CLI with user credentials that have ECR access
aws configure
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2:WebApp
```

### Option 3: Create Repository First (if it doesn't exist)
```bash
# Create ECR repository (requires permissions)
aws ecr create-repository --repository-name n11817143-a2 --region ap-southeast-2

# Then push
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2:WebApp
```

## 📋 **Container Details**

### **Built Images**
```bash
# List built images
docker images | grep video-webapp

# Check image details
docker inspect video-webapp:latest
```

### **Container Structure**
- **Base**: Node.js 22-slim
- **Backend**: Express server (Port 8080)
- **Frontend**: React + Vite (Port 3000)  
- **System**: FFmpeg for video processing
- **Health Check**: `/api/health` endpoint
- **Startup**: Combined script runs both services

### **Environment Variables**
```bash
# Backend
AWS_REGION=ap-southeast-2
CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com:3000
JWT_SECRET=change_me_in_production
USE_LOCAL_STORAGE=true

# Frontend  
VITE_API_URL=http://n11817143-videoapp.cab432.com:8080/api
VITE_AWS_REGION=ap-southeast-2
```

## 🧪 **Local Testing**

### **Run Container Locally**
```bash
# Run the combined container
docker run -d -p 8080:8080 -p 3000:3000 \
  --name video-webapp-test \
  video-webapp:latest

# Check logs
docker logs -f video-webapp-test

# Test endpoints
curl http://n11817143-videoapp.cab432.com:8080/api/health
curl http://n11817143-videoapp.cab432.com:3000
```

### **Debug Container**
```bash
# Enter container shell
docker exec -it video-webapp-test /bin/bash

# Check processes
docker exec video-webapp-test ps aux
```

## 📦 **Export/Import Alternative**

### **Save Container as TAR**
```bash
# Save image to file
docker save -o video-webapp.tar video-webapp:latest

# Load on another system
docker load -i video-webapp.tar
```

### **Manual ECR Push Process**
```bash
# After fixing permissions:
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com
docker tag video-webapp:latest 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2:WebApp
docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2:WebApp
```

## 🎯 **Next Steps**

1. **Fix IAM Permissions**: Add ECR access to instance role
2. **Create ECR Repository**: If it doesn't exist
3. **Push Container**: Use the docker push command above
4. **Deploy**: Use ECS, EKS, or EC2 to run the container

## 📝 **Container Specifications**

| Component | Details |
|-----------|---------|
| **Image Size** | ~1.2GB (multi-stage optimized) |
| **Node Version** | 22-slim |
| **Exposed Ports** | 8080 (API), 3000 (Frontend) |
| **Health Check** | 30s interval, 3 retries |
| **Startup Time** | ~10 seconds |
| **Dependencies** | FFmpeg, curl, npm packages |

The container is ready to deploy once ECR permissions are resolved! 🚀