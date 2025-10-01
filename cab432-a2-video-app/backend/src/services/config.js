const AWS = require('aws-sdk');

const region = process.env.AWS_REGION || 'ap-southeast-2';
AWS.config.update({ region });

const parameterPath = '/n11817143/app/';
const secretName = 'n11817143-a2-secret';

const ssm = new AWS.SSM();
const secretsManager = new AWS.SecretsManager();

let cachedConfig = null;
let fetchingPromise = null;

async function fetchParameters() {
  const params = {
    Path: parameterPath,
    Recursive: false,
    WithDecryption: true,
  };

  try {
    const response = await ssm.getParametersByPath(params).promise();
    const values = {};

    response.Parameters.forEach((param) => {
      const key = param.Name.replace(parameterPath, '');
      values[key] = param.Value;
    });

    return values;
  } catch (error) {
    console.warn('[config] Failed to load SSM parameters, falling back to environment variables.', error.message);
    return {};
  }
}

async function fetchSecret() {
  try {
    const secret = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    if (secret.SecretString) {
      return JSON.parse(secret.SecretString);
    }
    return {};
  } catch (error) {
    console.warn('[config] Failed to load secret, falling back to environment variables.', error.message);
    return {};
  }
}

function buildConfig(parameterValues, secretValues) {
  return {
    region,
    userPoolId:
      parameterValues.cognitoUserPoolId || process.env.COGNITO_USER_POOL_ID || '',
    userPoolClientId:
      parameterValues.cognitoClientId || process.env.COGNITO_CLIENT_ID || '',
    s3Bucket: parameterValues.s3Bucket || process.env.S3_BUCKET || '',
    dynamoTable: parameterValues.dynamoTable || process.env.DYNAMO_TABLE || '',
    elasticacheEndpoint:
      parameterValues.elasticacheEndpoint || process.env.ELASTICACHE_ENDPOINT || '',
    clientSecret:
      secretValues.COGNITO_CLIENT_SECRET || process.env.COGNITO_CLIENT_SECRET || '',
  };
}

async function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (fetchingPromise) {
    return fetchingPromise;
  }

  fetchingPromise = (async () => {
    const [parameters, secrets] = await Promise.all([fetchParameters(), fetchSecret()]);
    cachedConfig = buildConfig(parameters, secrets);
    fetchingPromise = null;
    return cachedConfig;
  })();

  return fetchingPromise;
}

function clearConfigCache() {
  cachedConfig = null;
  fetchingPromise = null;
}

module.exports = {
  loadConfig,
  clearConfigCache,
};
