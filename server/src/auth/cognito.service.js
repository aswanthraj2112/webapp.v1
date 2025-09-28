import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    ConfirmSignUpCommand,
    ResendConfirmationCodeCommand,
    AdminInitiateAuthCommand,
    AdminRespondToAuthChallengeCommand
} from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config.js';

class CognitoService {
    constructor() {
        this.client = new CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'ap-southeast-2'
        });
    }

    /**
     * Generate secret hash required for Cognito client authentication
     */
    generateSecretHash(username, clientId, clientSecret = null) {
        if (!clientSecret) {
            // If no client secret is configured, return undefined
            return undefined;
        }
        const message = username + clientId;
        return crypto.createHmac('SHA256', clientSecret).update(message).digest('base64');
    }

    /**
     * Register a new user with Cognito
     */
    async register(username, password, email) {
        try {
            const command = new SignUpCommand({
                ClientId: config.COGNITO_CLIENT_ID,
                Username: username,
                Password: password,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email || username // Use username as email if not provided
                    }
                ]
                // No SecretHash needed for simplified client configuration
            });

            const response = await this.client.send(command);
            return {
                userSub: response.UserSub,
                username: username,
                needsConfirmation: !response.UserConfirmed
            };
        } catch (error) {
            console.error('Cognito registration error:', error);
            throw new Error(this.handleCognitoError(error));
        }
    }

    /**
     * Authenticate user with Cognito using minimal AdminInitiateAuth flow
     */
    async login(username, password) {
        try {
            // Step 1: Initiate authentication
            const initCommand = new AdminInitiateAuthCommand({
                UserPoolId: config.COGNITO_USER_POOL_ID,
                ClientId: config.COGNITO_CLIENT_ID,
                AuthFlow: 'ADMIN_NO_SRP_AUTH',
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password
                    // No SECRET_HASH needed for this client configuration
                }
            });

            const response = await this.client.send(initCommand);

            // Step 2: Handle immediate success or challenge
            if (response.AuthenticationResult) {
                // Success - got tokens immediately
                const tokens = {
                    accessToken: response.AuthenticationResult.AccessToken,
                    idToken: response.AuthenticationResult.IdToken,
                    refreshToken: response.AuthenticationResult.RefreshToken,
                    tokenType: response.AuthenticationResult.TokenType,
                    expiresIn: response.AuthenticationResult.ExpiresIn
                };

                // Parse user info from ID token
                const userInfo = this.parseIdToken(tokens.idToken);
                return { ...tokens, user: userInfo };

            } else if (response.ChallengeName) {
                // Step 3: Handle challenges if needed
                return await this.handleAuthChallenge(response, username);
            }

            throw new Error('Unexpected authentication response');
        } catch (error) {
            console.error('Cognito login error:', error);
            throw new Error(this.handleCognitoError(error));
        }
    }

    /**
     * Handle authentication challenges
     */
    async handleAuthChallenge(challengeResponse, username) {
        const { ChallengeName, ChallengeParameters, Session } = challengeResponse;

        switch (ChallengeName) {
            case 'NEW_PASSWORD_REQUIRED':
                throw new Error('Password change required. Please update your password.');
            case 'MFA_SETUP':
                throw new Error('MFA setup required. Please configure multi-factor authentication.');
            case 'SOFTWARE_TOKEN_MFA':
                throw new Error('MFA code required. Please provide your authentication code.');
            default:
                throw new Error(`Unsupported challenge: ${ChallengeName}`);
        }
    }

    /**
     * Parse user information from ID token
     */
    parseIdToken(idToken) {
        try {
            // Decode without verification since it comes from Cognito
            const decoded = jwt.decode(idToken);

            return {
                id: decoded.sub,
                username: decoded['cognito:username'] || decoded.username,
                email: decoded.email || null,
                emailVerified: decoded.email_verified || false,
                groups: decoded['cognito:groups'] || [],
                // Include all Cognito attributes for flexibility
                attributes: decoded
            };
        } catch (error) {
            console.error('Failed to parse ID token:', error);
            throw new Error('Invalid authentication token received');
        }
    }

    /**
     * Confirm user registration with verification code
     */
    async confirmSignUp(username, confirmationCode) {
        try {
            const command = new ConfirmSignUpCommand({
                ClientId: config.COGNITO_CLIENT_ID,
                Username: username,
                ConfirmationCode: confirmationCode
                // No SecretHash needed for simplified client configuration
            });

            await this.client.send(command);
            return { success: true };
        } catch (error) {
            console.error('Cognito confirmation error:', error);
            throw new Error(this.handleCognitoError(error));
        }
    }

    /**
     * Resend confirmation code
     */
    async resendConfirmationCode(username) {
        try {
            const command = new ResendConfirmationCodeCommand({
                ClientId: config.COGNITO_CLIENT_ID,
                Username: username
                // No SecretHash needed for simplified client configuration
            });

            await this.client.send(command);
            return { success: true };
        } catch (error) {
            console.error('Cognito resend confirmation error:', error);
            throw new Error(this.handleCognitoError(error));
        }
    }

    /**
     * Handle Cognito error messages
     */
    handleCognitoError(error) {
        switch (error.name) {
            case 'UserNotFoundException':
                return 'User not found. Please check your username or register a new account.';
            case 'NotAuthorizedException':
                return 'Invalid username or password.';
            case 'UserNotConfirmedException':
                return 'Account not verified. Please check your email for verification code.';
            case 'UsernameExistsException':
                return 'Username already exists. Please choose a different username.';
            case 'InvalidPasswordException':
                return 'Password does not meet requirements.';
            case 'CodeMismatchException':
                return 'Invalid verification code.';
            case 'ExpiredCodeException':
                return 'Verification code has expired. Please request a new code.';
            case 'TooManyRequestsException':
                return 'Too many requests. Please try again later.';
            default:
                return error.message || 'Authentication service error.';
        }
    }
}

export default new CognitoService();