import { Amplify } from 'aws-amplify';

// Get configuration from environment variables or use defaults
const config = {
    Auth: {
        Cognito: {
            region: import.meta.env.VITE_AWS_REGION || 'ap-southeast-2',
            userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
            loginWith: {
                email: false,
                phone: false,
                username: true
            },
            signUpVerificationMethod: 'code',
            userAttributes: {
                email: {
                    required: true
                }
            },
            allowGuestAccess: false,
            passwordFormat: {
                minLength: 6,
                requireLowercase: false,
                requireUppercase: false,
                requireNumbers: false,
                requireSpecialCharacters: false
            }
        }
    }
};

// Note: In development, we'll configure this dynamically from the backend
// In production, these should be set as environment variables
export const configureCognito = async (cognitoConfig) => {
    const amplifyConfig = {
        Auth: {
            Cognito: {
                ...config.Auth.Cognito,
                userPoolId: cognitoConfig.userPoolId || config.Auth.Cognito.userPoolId,
                userPoolClientId: cognitoConfig.clientId || config.Auth.Cognito.userPoolClientId
            }
        }
    };

    try {
        Amplify.configure(amplifyConfig);
        console.log('✅ Cognito configured successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to configure Cognito:', error);
        return false;
    }
};

export default config;