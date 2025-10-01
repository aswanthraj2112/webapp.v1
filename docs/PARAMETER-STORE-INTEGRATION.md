# AWS Parameter Store Integration

This document describes the AWS Parameter Store integration implemented for the video web application.

## Overview

The application now uses AWS Systems Manager Parameter Store to manage configuration parameters, providing centralized configuration management with the following benefits:

- **Centralized Configuration**: All configuration parameters are stored in one place
- **Security**: Support for SecureString parameters with encryption
- **Caching**: Parameters are cached to improve performance
- **Fallback Support**: Graceful degradation to environment variables if Parameter Store is unavailable
- **Batch Loading**: Efficient loading of multiple parameters at once

## Parameter Structure

All parameters are stored under the prefix `/n11817143/app/` in AWS Parameter Store:

### Required Parameters

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `cognitoClientId` | AWS Cognito Client ID | `abc123def456` |
| `cognitoUserPoolId` | AWS Cognito User Pool ID | `ap-southeast-2_ABC123DEF` |
| `domainName` | Application domain name | `n11817143-videoapp.cab432.com` |
| `dynamoTable` | DynamoDB table name | `n11817143-videos` |
| `dynamoOwnerIndex` | DynamoDB GSI for owner queries | `owner-index` |
| `s3Bucket` | S3 bucket name | `n11817143-a2` |

### Optional Parameters (with defaults)

| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `maxUploadSizeMb` | Maximum upload size in MB | `512` |
| `preSignedUrlTTL` | Presigned URL TTL in seconds | `600` |
| `s3_raw_prefix` | S3 prefix for raw videos | `s3://n11817143-a2/raw/` |
| `s3_thumbnail_prefix` | S3 prefix for thumbnails | `s3://n11817143-a2/thumbnails/` |
| `s3_transcoded_prefix` | S3 prefix for transcoded videos | `s3://n11817143-a2/transcoded/` |

## Usage

### Application Startup

The application automatically loads all parameters during startup:

```javascript
import config from './config.js';

// Initialize all configurations
await config.initialize();

// Access configuration values
console.log(`S3 Bucket: ${config.S3_BUCKET}`);
console.log(`Max Upload: ${config.MAX_UPLOAD_SIZE_MB}MB`);
```

### Direct Parameter Access

You can also access parameters directly using the Parameter Store utility:

```javascript
import { getParameter, getParameters } from './utils/parameterStore.js';

// Get a single parameter
const s3Bucket = await getParameter('s3Bucket');

// Get multiple parameters at once
const params = await getParameters(['s3Bucket', 'dynamoTable']);
```

## CLI Management

The application includes a CLI tool for managing Parameter Store parameters:

### List all parameters
```bash
npm run params:list
```

### Validate configuration
```bash
npm run params:validate
```

### Test Parameter Store integration
```bash
npm run params:test
```

### Clear parameter cache
```bash
npm run params:clear-cache
```

### Get specific parameter
```bash
node parameter-cli.js get s3Bucket
```

## Configuration Files

### Core Files

- `src/utils/parameterStore.js` - Main Parameter Store utility functions
- `src/config.js` - Main application configuration with Parameter Store integration
- `src/config.s3.js` - S3-specific configuration loader
- `src/config.dynamo.js` - DynamoDB-specific configuration loader

### Management Tools

- `parameter-cli.js` - CLI tool for parameter management
- `test-parameter-store.js` - Integration test script

## Error Handling

The Parameter Store integration includes comprehensive error handling:

1. **Graceful Fallback**: If Parameter Store is unavailable, the application falls back to environment variables
2. **Detailed Logging**: All parameter loading operations are logged with status indicators
3. **Validation**: Required parameters are validated during startup
4. **Cache Management**: Parameters are cached for performance, with cache management utilities

## Performance Features

- **Batch Loading**: Multiple parameters are loaded in a single API call
- **Intelligent Caching**: Parameters are cached in memory to reduce API calls
- **Lazy Loading**: Parameters are only loaded when needed
- **Cache Statistics**: Monitor cache performance with built-in statistics

## Security Considerations

- **Encryption Support**: SecureString parameters are automatically decrypted
- **IAM Permissions**: Ensure the application has appropriate SSM permissions
- **No Secrets in Logs**: Sensitive parameters are not logged in plain text

## Monitoring and Troubleshooting

### Common Issues

1. **Missing Parameters**: Use `npm run params:validate` to check all required parameters
2. **Permission Errors**: Ensure the application has `ssm:GetParameter` and `ssm:GetParameters` permissions
3. **Regional Issues**: Verify the `AWS_REGION` environment variable is set correctly

### Debugging

Enable detailed logging by setting environment variables:
```bash
export AWS_SDK_LOAD_CONFIG=1
export AWS_SDK_LOG_LEVEL=debug
```

### Health Checks

The application provides configuration status in startup logs:
- ✅ Parameter loaded successfully
- ⚠️ Using fallback value
- ❌ Parameter missing or failed to load

## Migration from Environment Variables

The Parameter Store integration maintains backward compatibility:

1. **Legacy Support**: Environment variables are still supported as fallbacks
2. **Gradual Migration**: You can migrate parameters one at a time
3. **Testing**: Use the test script to verify parameter loading before deployment

## Best Practices

1. **Parameter Naming**: Use consistent naming conventions with descriptive names
2. **Documentation**: Document all parameters and their expected values
3. **Testing**: Always test parameter loading in your deployment pipeline
4. **Monitoring**: Monitor Parameter Store API usage and costs
5. **Backup**: Consider backing up critical parameters

## AWS Setup

### Required IAM Permissions

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters"
            ],
            "Resource": "arn:aws:ssm:ap-southeast-2:*:parameter/n11817143/app/*"
        }
    ]
}
```

### Creating Parameters

Use AWS CLI to create parameters:

```bash
# Required parameters
aws ssm put-parameter --name "/n11817143/app/cognitoClientId" --value "your-client-id" --type "String"
aws ssm put-parameter --name "/n11817143/app/cognitoUserPoolId" --value "your-pool-id" --type "String"
aws ssm put-parameter --name "/n11817143/app/domainName" --value "n11817143-videoapp.cab432.com" --type "String"
aws ssm put-parameter --name "/n11817143/app/dynamoTable" --value "n11817143-videos" --type "String"
aws ssm put-parameter --name "/n11817143/app/dynamoOwnerIndex" --value "owner-index" --type "String"
aws ssm put-parameter --name "/n11817143/app/s3Bucket" --value "n11817143-a2" --type "String"

# Optional parameters
aws ssm put-parameter --name "/n11817143/app/maxUploadSizeMb" --value "512" --type "String"
aws ssm put-parameter --name "/n11817143/app/preSignedUrlTTL" --value "600" --type "String"
aws ssm put-parameter --name "/n11817143/app/s3_raw_prefix" --value "s3://n11817143-a2/raw/" --type "String"
aws ssm put-parameter --name "/n11817143/app/s3_thumbnail_prefix" --value "s3://n11817143-a2/thumbnails/" --type "String"
aws ssm put-parameter --name "/n11817143/app/s3_transcoded_prefix" --value "s3://n11817143-a2/transcoded/" --type "String"
```