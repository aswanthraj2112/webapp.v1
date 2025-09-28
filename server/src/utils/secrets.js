import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'ap-southeast-2'
});

/**
 * Retrieves a secret from AWS Secrets Manager
 * @param {string} secretName - The name of the secret to retrieve
 * @returns {Promise<string>} The secret value
 */
export async function getSecret(secretName) {
    try {
        const command = new GetSecretValueCommand({
            SecretId: secretName
        });

        const response = await client.send(command);

        if (response.SecretString) {
            // Try to parse as JSON first (in case it's a key-value pair)
            try {
                const parsed = JSON.parse(response.SecretString);
                return parsed;
            } catch {
                // Return as plain string if not JSON
                return response.SecretString;
            }
        }

        if (response.SecretBinary) {
            // Handle binary secrets if needed
            return Buffer.from(response.SecretBinary).toString('utf-8');
        }

        throw new Error('No secret value found');
    } catch (error) {
        console.error(`Error retrieving secret ${secretName}:`, error.message);
        throw error;
    }
}

/**
 * Retrieves the JWT secret from AWS Secrets Manager
 * @returns {Promise<string>} The JWT secret value
 */
export async function getJWTSecret() {
    const secretName = 'n11817143-a2-secret';

    try {
        const secret = await getSecret(secretName);

        // If it's a JSON object, extract JWT_SECRET key
        if (typeof secret === 'object' && secret.JWT_SECRET) {
            return secret.JWT_SECRET;
        }

        // If it's a plain string, return it directly
        if (typeof secret === 'string') {
            return secret;
        }

        throw new Error('JWT_SECRET not found in secret');
    } catch (error) {
        console.error('Failed to retrieve JWT secret from Secrets Manager:', error.message);
        console.log('Falling back to environment variable or default');
        return process.env.JWT_SECRET || 'change_me';
    }
}

export default { getSecret, getJWTSecret };