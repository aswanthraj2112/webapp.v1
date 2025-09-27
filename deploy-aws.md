# AWS Deployment Guide for n11817143-videoapp.cab432.com

## Step 1: Create AWS ECR Repositories

```bash
# Create ECR repositories
aws ecr create-repository --repository-name video-webapp-backend --region ap-southeast-2
aws ecr create-repository --repository-name video-webapp-frontend --region ap-southeast-2

# Get login token
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com
```

## Step 2: Build and Push Docker Images

```bash
# Build and tag backend
docker build -t video-webapp-backend ./server
docker tag video-webapp-backend:latest <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-backend:latest
docker push <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-backend:latest

# Build and tag frontend
docker build -t video-webapp-frontend ./client
docker tag video-webapp-frontend:latest <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-frontend:latest
docker push <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-frontend:latest
```

## Step 3: Set Up AWS Systems Manager Parameters

Your app uses SSM parameters. Create these in AWS Systems Manager:

```bash
# S3 Configuration
aws ssm put-parameter --name "/n11817143/app/s3Bucket" --value "your-video-bucket-name" --type "String" --region ap-southeast-2
aws ssm put-parameter --name "/n11817143/app/s3_raw_prefix" --value "raw/" --type "String" --region ap-southeast-2
aws ssm put-parameter --name "/n11817143/app/s3_transcoded_prefix" --value "transcoded/" --type "String" --region ap-southeast-2
aws ssm put-parameter --name "/n11817143/app/s3_thumbnail_prefix" --value "thumbs/" --type "String" --region ap-southeast-2
aws ssm put-parameter --name "/n11817143/app/presigned_ttl_seconds" --value "3600" --type "String" --region ap-southeast-2

# DynamoDB Configuration
aws ssm put-parameter --name "/n11817143/app/dynamoTable" --value "video-webapp-table" --type "String" --region ap-southeast-2
aws ssm put-parameter --name "/n11817143/app/dynamoOwnerIndex" --value "ownerId-index" --type "String" --region ap-southeast-2
```

## Step 4: Launch EC2 Instance

1. **Create an EC2 instance** (t3.medium or larger recommended)
2. **Install Docker** on the instance
3. **Create IAM role** with permissions for:
   - S3 (read/write to your video bucket)
   - DynamoDB (read/write to your table)
   - SSM (read parameters)
   - ECR (pull images)

## Step 5: Deploy on EC2

SSH into your EC2 instance and run:

```bash
# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Authenticate with ECR
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com

# Pull and run containers
docker pull <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-backend:latest
docker pull <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-frontend:latest

# Run containers
docker run -d -p 8080:8080 \
  -e AWS_REGION=ap-southeast-2 \
  -e CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com \
  -e USE_DYNAMO=true \
  --name video-backend \
  <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-backend:latest

docker run -d -p 80:80 \
  --name video-frontend \
  <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/video-webapp-frontend:latest
```

## Step 6: Configure Route 53

1. **Go to Route 53 console**
2. **Find your hosted zone** for `cab432.com`
3. **Create an A record** for `n11817143-videoapp.cab432.com` pointing to your EC2 instance's public IP

## Step 7: Security Groups

Make sure your EC2 security group allows:
- **Port 80** (HTTP) from 0.0.0.0/0
- **Port 8080** (API) from 0.0.0.0/0  
- **Port 22** (SSH) from your IP

## Step 8: Test Deployment

Your app should now be accessible at:
- **http://n11817143-videoapp.cab432.com** (frontend)
- **http://n11817143-videoapp.cab432.com:8080** (API)

## Environment Variables Summary

Your containers are already configured with:
- `AWS_REGION=ap-southeast-2`
- `CLIENT_ORIGINS=http://n11817143-videoapp.cab432.com`
- `VITE_API_URL=http://n11817143-videoapp.cab432.com/api`

## Optional: Use Application Load Balancer

For production, consider setting up an ALB to:
- Route port 80 to frontend container
- Route `/api/*` to backend container on port 8080
- Enable HTTPS with SSL certificate