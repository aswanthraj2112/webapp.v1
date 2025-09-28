import { signUp, signIn, confirmSignUp, resendSignUpCode, getCurrentUser, signOut } from 'aws-amplify/auth';

class CognitoAuthService {
    /**
     * Register a new user
     */
    async register(username, password, email) {
        try {
            const result = await signUp({
                username,
                password,
                options: {
                    userAttributes: {
                        email: email || username
                    }
                }
            });

            return {
                userSub: result.userSub,
                username,
                needsConfirmation: !result.isSignUpComplete
            };
        } catch (error) {
            console.error('Registration error:', error);
            throw new Error(this.handleAmplifyError(error));
        }
    }

    /**
     * Sign in user
     */
    async login(username, password) {
        try {
            const result = await signIn({ username, password });

            if (result.isSignedIn) {
                const user = await getCurrentUser();
                const session = await user.getSession();

                return {
                    accessToken: session.getAccessToken().getJwtToken(),
                    idToken: session.getIdToken().getJwtToken(),
                    refreshToken: session.getRefreshToken().getToken(),
                    user: {
                        id: user.attributes.sub,
                        username: user.username,
                        email: user.attributes.email
                    }
                };
            } else if (result.nextStep) {
                throw new Error(`Additional step required: ${result.nextStep.signInStep}`);
            }
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(this.handleAmplifyError(error));
        }
    }

    /**
     * Confirm sign up with verification code
     */
    async confirmSignUp(username, confirmationCode) {
        try {
            const result = await confirmSignUp({
                username,
                confirmationCode
            });

            return { success: result.isSignUpComplete };
        } catch (error) {
            console.error('Confirmation error:', error);
            throw new Error(this.handleAmplifyError(error));
        }
    }

    /**
     * Resend confirmation code
     */
    async resendConfirmationCode(username) {
        try {
            await resendSignUpCode({ username });
            return { success: true };
        } catch (error) {
            console.error('Resend confirmation error:', error);
            throw new Error(this.handleAmplifyError(error));
        }
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        try {
            const user = await getCurrentUser();
            const session = await user.getSession();

            return {
                accessToken: session.getAccessToken().getJwtToken(),
                user: {
                    id: user.attributes.sub,
                    username: user.username,
                    email: user.attributes.email
                }
            };
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    /**
     * Sign out user
     */
    async logout() {
        try {
            await signOut();
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            throw new Error(this.handleAmplifyError(error));
        }
    }

    /**
     * Handle Amplify/Cognito errors
     */
    handleAmplifyError(error) {
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
            case 'LimitExceededException':
                return 'Attempt limit exceeded. Please try again later.';
            default:
                return error.message || 'Authentication service error.';
        }
    }
}

export default new CognitoAuthService();