# **Project Blueprint:  Cloud Video Transcoder**

This document contains the complete instructions, architecture, and configuration for building a full-stack video transcoder application on AWS. The objective is to meet and exceed all criteria for a university assignment to achieve a perfect score.

## **1\. High-Level Architecture**

The application will be a stateless, containerized web service deployed on a single EC2 instance.

* **Frontend**: A React single-page application (SPA) served by Nginx.  
* **Backend**: A Node.js/Express REST API.  
* **Database**: DynamoDB for metadata and ElastiCache for caching.  
* **Storage**: S3 for video files.  
* **Authentication**: AWS Cognito for user management.  
* **Configuration**: AWS Parameter Store and Secrets Manager.  
* **Deployment**: Docker Compose on EC2.  
* **Infrastructure Management**: Terraform (Infrastructure as Code).

## **2\. Overall Project Structure**

Create a monorepo with the following directory structure.

/cab432-a2-video-app/  
|  
├── /terraform/              \# All Terraform (.tf) files for infrastructure  
|  
├── /backend/                \# Node.js/Express application  
|   ├── src/  
|   |   ├── controllers/  
|   |   ├── middleware/  
|   |   ├── routes/  
|   |   ├── services/      \# Logic for interacting with AWS  
|   |   └── index.js  
|   ├── Dockerfile  
|   └── package.json  
|  
├── /frontend/               \# React application  
|   ├── public/  
|   ├── src/  
|   |   ├── components/  
|   |   ├── contexts/  
|   |   ├── hooks/  
|   |   └── pages/  
|   ├── nginx/  
|   |   └── default.conf   \# Nginx configuration  
|   ├── Dockerfile  
|   └── package.json  
|  
└── docker-compose.yml       \# Docker Compose file to orchestrate services

## **3\. Part 1: Infrastructure as Code (Terraform)**

Create a directory /terraform and define all the following AWS resources. Use the AWS provider for ap-southeast-2.

### **providers.tf**

* Configure the AWS provider for region ap-southeast-2.

### **s3.tf**

* **Resource**: aws\_s3\_bucket  
* **Name**: n11817143-a2  
* **Configuration**: Set to private, block all public access.

### **dynamodb.tf**

* **Resource**: aws\_dynamodb\_table  
* **Name**: n11817143-VideoApp  
* **Attributes**: userId (String), videoId (String), status (String), filename (String), createdAt (String).  
* **Key Schema**: Partition Key userId, Sort Key videoId.

### **elasticache.tf**

* **Resource**: aws\_elasticache\_cluster  
* **Cluster ID**: n11817143-a2-cache  
* **Engine**: memcached  
* **Node Type**: cache.t2.micro  
* **Security Group**: Ensure it's in a security group that allows inbound TCP traffic on port 11211 from the EC2 instance's security group (CAB432SG).

### **cognito.tf**

* **Resource**: aws\_cognito\_user\_pool  
* **Name**: n11817143-a2  
* **MFA Configuration**: Set to ON. sms\_configuration is not needed.  
* **Schema**: Standard attributes (email, name, etc.).  
* **Resource**: aws\_cognito\_user\_pool\_client  
* **Name**: webapp-client  
* **Configuration**: Generate a client secret. Enable ALLOW\_USER\_SRP\_AUTH.  
* **Resource**: aws\_cognito\_user\_group (create two)  
* **Group Names**: standard-users, premium-users.

### **ssm.tf (Parameter Store)**

* Create aws\_ssm\_parameter resources for all non-sensitive configs under the path /n11817143/app/.  
* **Parameters to create**:  
  * /cognitoUserPoolId  
  * /cognitoClientId  
  * /s3Bucket \-\> n11817143-a2  
  * /dynamoTable \-\> n11817143-VideoApp  
  * /elasticacheEndpoint \-\> The configuration endpoint of the ElastiCache cluster.

### **secretsmanager.tf**

* **Resource**: aws\_secretsmanager\_secret  
* **Name**: n11817143-a2-secret  
* **Secret String**: Store the Cognito App Client Secret here in a JSON structure: {"COGNITO\_CLIENT\_SECRET": "your-secret-value"}.

### **route53.tf**

* **Resource**: aws\_route53\_record  
* **Zone ID**: Z02680423BHWEVRU2JZDQ  
* **Name**: n11817143-videoapp.cab432.com  
* **Type**: CNAME  
* **TTL**: 60  
* **Records**: \["ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com"\]

## **4\. Part 2: Backend Development (Node.js/Express)**

Create the application in the /backend directory.

### **package.json**

* **Dependencies**: express, cors, aws-sdk, jsonwebtoken, jwk-to-pem, node-fetch, memcached.

### **Configuration (/src/services/config.js)**

* On startup, create a service that fetches all parameters from AWS Parameter Store and secrets from Secrets Manager. Cache these values in memory so they are not fetched on every request.

### **Authentication Middleware (/src/middleware/auth.js)**

* Create an Express middleware function verifyToken.  
* It must:  
  1. Extract the JWT from the Authorization: Bearer \<token\> header.  
  2. Fetch the JWKS (JSON Web Key Set) from your Cognito User Pool's .well-known/jwks.json URL.  
  3. Verify the token's signature using the appropriate public key from the JWKS.  
  4. If valid, decode the token and attach the user's details (e.g., username, cognito:groups) to the req.user object.  
  5. If invalid, send a 401 Unauthorized response.

### **API Endpoints (/src/routes/ and /src/controllers/)**

* **POST /api/videos/initiate-upload**  
  * **Logic**: Accepts { filename, fileType } in the request body. Generates a unique videoId (UUID). Creates a pre-signed URL for an S3 PUT operation. The S3 key must be raw-videos/{req.user.username}/{videoId}/{filename}.  
  * **Returns**: { uploadUrl, videoId }.  
* **POST /api/videos/finalize-upload**  
  * **Logic**: Accepts { videoId, filename }. Creates a new item in the DynamoDB table with the userId (from req.user.username), videoId, filename, status: 'UPLOADED', and createdAt timestamp.  
  * **Returns**: { success: true, message: 'Video metadata saved.' }.  
* **GET /api/videos**  
  * **Logic**:  
    1. Create a cache key (e.g., videos:${req.user.username}).  
    2. Try to get the data from ElastiCache using this key.  
    3. If found (cache hit), return the cached data.  
    4. If not found (cache miss), query DynamoDB for all items where the userId matches req.user.username.  
    5. Store the query result in ElastiCache with a TTL of 30 seconds.  
    6. Return the data.  
  * **Returns**: An array of video metadata objects.  
* **POST /api/videos/:videoId/transcode**  
  * **Logic**:  
    1. Check if req.user\['cognito:groups'\] contains premium-users.  
    2. Based on the group, determine the allowed transcoding quality.  
    3. Update the item's status in DynamoDB to TRANSCODING.  
    4. Simulate the transcoding process with a setTimeout of 15 seconds. After the timeout, update the status to COMPLETED.  
  * **Returns**: { success: true, message: 'Transcoding started.' }.  
* **GET /api/videos/:videoId/download-url**  
  * **Logic**: Accepts a version query parameter (e.g., ?version=transcoded). Generates an S3 pre-signed URL for a GET request on the appropriate S3 object (raw-videos/... or transcoded-videos/...).  
  * **Returns**: { downloadUrl }.

### **Dockerfile (in /backend)**

* Use a node:18-alpine base image.  
* Copy package.json, install dependencies, then copy the rest of the source code.  
* Expose port 8080\.  
* The CMD should be \["node", "src/index.js"\].

## **5\. Part 3: Frontend Development (React)**

Create the application in the /frontend directory.

### **package.json**

* **Dependencies**: react, react-dom, axios, aws-amplify, @aws-amplify/ui-react.

### **Amplify Configuration (/src/index.js)**

* Configure AWS Amplify with your Cognito User Pool ID, App Client ID, and region. Fetch these values from your backend or environment variables.

### **Components (/src/components/)**

* **Authenticator**: Use the pre-built @aws-amplify/ui-react Authenticator component. It should handle sign-in, sign-up, and the MFA flow automatically.  
* **Dashboard**: The main page for authenticated users.  
* **VideoList**: Fetches and displays videos. Shows a "Processing..." status for videos being transcoded.  
* **UploadForm**:  
  1. User selects a file.  
  2. On submit, it hits the /api/videos/initiate-upload backend endpoint to get the pre-signed URL.  
  3. It then makes a direct PUT request to the returned uploadUrl with the file, using axios to show upload progress.  
  4. On success, it hits /api/videos/finalize-upload.

### **Polling for Transcoding Status**

* In the Dashboard component, after a transcoding request is made, use setInterval to poll a new backend endpoint (e.g., GET /api/videos/:videoId/status) every 5 seconds.  
* When the status returned from the backend is COMPLETED, clear the interval and update the UI.

### **Dockerfile (in /frontend)**

* Use a multi-stage build.  
* **Stage 1 (build)**: Use a node:18-alpine image, copy the source code, run npm install, and run npm run build.  
* **Stage 2 (serve)**: Use a nginx:stable-alpine image. Copy the build directory from Stage 1 into the Nginx HTML directory. Copy the nginx/default.conf file into the Nginx configuration directory.

### **nginx/default.conf**

* This is the Nginx configuration for the reverse proxy.

server {  
    listen 80;

    \# Serve React App  
    location / {  
        root   /usr/share/nginx/html;  
        index  index.html index.htm;  
        try\_files $uri /index.html;  
    }

    \# Reverse Proxy for API  
    location /api {  
        proxy\_pass http://backend:8080;  
        proxy\_set\_header Host $host;  
        proxy\_set\_header X-Real-IP $remote\_addr;  
        proxy\_set\_header X-Forwarded-For $proxy\_add\_x\_forwarded\_for;  
    }  
}

## **6\. Part 4: Deployment (Docker Compose)**

Create the docker-compose.yml file in the root directory.

version: '3.8'

services:  
  frontend:  
    build:  
      context: ./frontend  
    ports:  
      \- "80:80"  
    restart: always

  backend:  
    build:  
      context: ./backend  
    ports:  
      \- "8080:8080"  
    restart: always  
    environment:  
      \# These will be fetched by the app from AWS, but can be set for local dev  
      \- AWS\_REGION=ap-southeast-2  
      \# The EC2 instance role will provide credentials in production  
      \- AWS\_ACCESS\_KEY\_ID=YOUR\_LOCAL\_KEY  
      \- AWS\_SECRET\_ACCESS\_KEY=YOUR\_LOCAL\_SECRET

