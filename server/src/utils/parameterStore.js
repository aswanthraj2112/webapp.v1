import { SSMClient, GetParameterCommand, GetParametersCommand } from '@aws-sdk/client-ssm';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const ssm = new SSMClient({ region: REGION });
const paramCache = new Map();
const PARAM_PREFIX = '/n11817143/app';

/**
 * Get a single parameter from Parameter Store
 * @param {string} name - Parameter name (without prefix)
 * @param {boolean} useCache - Whether to use cached value
 * @returns {Promise<string>} Parameter value
 */
async function getParameter(name, useCache = true) {
    const paramName = name.startsWith('/') ? name : `${PARAM_PREFIX}/${name}`;

    if (useCache && paramCache.has(paramName)) {
        return paramCache.get(paramName);
    }

    try {
        const command = new GetParameterCommand({
            Name: paramName,
            WithDecryption: true // Support SecureString parameters
        });

        const { Parameter } = await ssm.send(command);
        const value = Parameter.Value;

        if (useCache) {
            paramCache.set(paramName, value);
        }

        return value;
    } catch (error) {
        console.error(`Failed to get parameter ${paramName}:`, error.message);
        throw error;
    }
}

/**
 * Get a parameter with a default value if not found
 * @param {string} name - Parameter name
 * @param {string} defaultValue - Default value if parameter not found
 * @param {boolean} useCache - Whether to use cached value
 * @returns {Promise<string>} Parameter value or default
 */
async function getParameterWithDefault(name, defaultValue, useCache = true) {
    try {
        return await getParameter(name, useCache);
    } catch (error) {
        console.warn(`Parameter ${name} not found, using default: ${defaultValue}`);
        return defaultValue;
    }
}

/**
 * Get multiple parameters at once for better performance
 * AWS Parameter Store limits GetParameters to 10 parameters max
 * @param {string[]} names - Array of parameter names (without prefix)
 * @returns {Promise<Object>} Object with parameter names as keys and values
 */
async function getParameters(names) {
    const paramNames = names.map(name =>
        name.startsWith('/') ? name : `${PARAM_PREFIX}/${name}`
    );

    // Check cache first
    const cached = {};
    const uncachedNames = [];
    const uncachedOriginalNames = [];

    for (let i = 0; i < paramNames.length; i++) {
        const paramName = paramNames[i];
        const originalName = names[i];

        if (paramCache.has(paramName)) {
            cached[originalName] = paramCache.get(paramName);
        } else {
            uncachedNames.push(paramName);
            uncachedOriginalNames.push(originalName);
        }
    }

    if (uncachedNames.length === 0) {
        return cached;
    }

    const result = { ...cached };

    // Process in batches of 10 (AWS GetParameters limit)
    const BATCH_SIZE = 10;
    for (let i = 0; i < uncachedNames.length; i += BATCH_SIZE) {
        const batchNames = uncachedNames.slice(i, i + BATCH_SIZE);
        const batchOriginalNames = uncachedOriginalNames.slice(i, i + BATCH_SIZE);

        try {
            const command = new GetParametersCommand({
                Names: batchNames,
                WithDecryption: true
            });

            const { Parameters } = await ssm.send(command);

            for (const param of Parameters) {
                const paramIndex = batchNames.indexOf(param.Name);
                if (paramIndex !== -1) {
                    const originalName = batchOriginalNames[paramIndex];
                    result[originalName] = param.Value;
                    paramCache.set(param.Name, param.Value);
                }
            }

            // Check for missing parameters in this batch
            for (let j = 0; j < batchNames.length; j++) {
                const paramName = batchNames[j];
                const found = Parameters.some(p => p.Name === paramName);
                if (!found) {
                    console.warn(`Parameter ${paramName} not found in Parameter Store`);
                }
            }

        } catch (error) {
            console.error(`Failed to get parameter batch ${i}-${i + BATCH_SIZE}:`, error.message);
            throw error;
        }
    }

    return result;
}/**
 * Load all application parameters from Parameter Store
 * @returns {Promise<Object>} Configuration object with all parameters
 */
async function loadAppConfig() {
    try {
        console.log('🔄 Loading configuration from Parameter Store...');

        const paramNames = [
            'cognitoClientId',
            'cognitoUserPoolId',
            'domainName',
            'dynamoTable',
            'dynamoOwnerIndex',
            'maxUploadSizeMb',
            'preSignedUrlTTL',
            's3Bucket',
            's3_raw_prefix',
            's3_thumbnail_prefix',
            's3_transcoded_prefix'
        ];

        const params = await getParameters(paramNames);

        const config = {
            REGION,
            COGNITO_CLIENT_ID: params.cognitoClientId,
            COGNITO_USER_POOL_ID: params.cognitoUserPoolId,
            DOMAIN_NAME: params.domainName,
            DYNAMO_TABLE: params.dynamoTable,
            DYNAMO_OWNER_INDEX: params.dynamoOwnerIndex,
            MAX_UPLOAD_SIZE_MB: parseInt(params.maxUploadSizeMb || '512', 10),
            PRESIGNED_URL_TTL: parseInt(params.preSignedUrlTTL || '600', 10),
            S3_BUCKET: params.s3Bucket,
            S3_RAW_PREFIX: params.s3_raw_prefix,
            S3_THUMBNAIL_PREFIX: params.s3_thumbnail_prefix,
            S3_TRANSCODED_PREFIX: params.s3_transcoded_prefix
        };

        console.log('✅ Configuration loaded from Parameter Store');
        console.log(`📊 Loaded ${Object.keys(params).length} parameters`);

        return config;
    } catch (error) {
        console.error('❌ Failed to load configuration from Parameter Store:', error.message);
        throw error;
    }
}

/**
 * Clear the parameter cache
 */
function clearCache() {
    paramCache.clear();
    console.log('🧹 Parameter cache cleared');
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
    return {
        size: paramCache.size,
        keys: Array.from(paramCache.keys())
    };
}

export {
    getParameter,
    getParameterWithDefault,
    getParameters,
    loadAppConfig,
    clearCache,
    getCacheStats
};