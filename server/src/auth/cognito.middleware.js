import {
    CognitoIdentityProviderClient,
    GetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { AuthenticationError } from '../utils/errors.js';
import { verifyToken } from './jwt.js';
import config from '../config.js';

class CognitoAuthMiddleware {
    constructor() {
        this.client = new CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'ap-southeast-2'
        });
    }

    async verifyAccessToken(accessToken) {
        try {
            const command = new GetUserCommand({
                AccessToken: accessToken
            });

            const response = await this.client.send(command);

            // Extract user information from Cognito response
            const attributes = {};
            response.UserAttributes.forEach(attr => {
                attributes[attr.Name] = attr.Value;
            });

            return {
                id: attributes.sub,
                username: response.Username,
                email: attributes.email,
                emailVerified: attributes.email_verified === 'true'
            };
        } catch (error) {
            console.error('Cognito token verification error:', error);
            throw new AuthenticationError('Invalid or expired access token');
        }
    }

    middleware() {
        return async (req, res, next) => {
            const authHeader = req.headers.authorization;
            let token = null;

            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.slice(7);
            } else if (req.query && req.query.token) {
                token = req.query.token;
            }

            if (!token) {
                return next(new AuthenticationError('Missing authentication token'));
            }

            try {
                // First, try to verify as Cognito access token
                const user = await this.verifyAccessToken(token);
                req.user = user;
                return next();
            } catch (cognitoError) {
                // If Cognito verification fails, try internal JWT (for backward compatibility)
                try {
                    const payload = verifyToken(token);
                    req.user = {
                        id: payload.sub,
                        username: payload.username
                    };
                    return next();
                } catch (jwtError) {
                    return next(new AuthenticationError('Invalid or expired token'));
                }
            }
        };
    }
}

export default new CognitoAuthMiddleware().middleware();