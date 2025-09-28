import { AppError } from '../utils/errors.js';
import { signToken } from './jwt.js';
import cognitoService from './cognito.service.js';
import userStore from './user.store.js';
import passwordStore from './password.store.js';

export const register = async (req, res) => {
  try {
    const { username, password, email } = req.validatedBody;

    // Step 1: Register with Cognito (this works with current permissions)
    const result = await cognitoService.register(username, password, email);

    // Step 2: Store password for internal authentication
    await passwordStore.setPassword(username, password);

    if (result.needsConfirmation) {
      res.status(201).json({
        message: 'Registration successful. Please check your email for verification code.',
        needsConfirmation: true,
        username: result.username
      });
    } else {
      // Step 3: Add to user store and auto-login if no confirmation needed
      const user = await userStore.addUser(username, email, result.userSub);
      const token = signToken({ id: user.id, username: user.username });

      res.status(201).json({
        message: 'Registration and login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    }
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.validatedBody;

    // Step 1: Check if user exists in our store (means they completed Cognito registration)
    const user = await userStore.getUser(username);
    if (!user) {
      throw new Error('User not found. Please register first.');
    }

    // Step 2: Verify password using internal store
    const isValidPassword = await passwordStore.verifyPassword(username, password);
    if (!isValidPassword) {
      throw new Error('Invalid username or password.');
    }

    // Step 3: Generate internal JWT token
    const token = signToken({
      id: user.id,
      username: user.username,
      sub: user.id // For compatibility
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      message: 'Login successful'
    });
  } catch (error) {
    throw new AppError(error.message, 401);
  }
};

export const confirmSignUp = async (req, res) => {
  try {
    const { username, confirmationCode } = req.validatedBody;

    // Step 1: Confirm with Cognito
    await cognitoService.confirmSignUp(username, confirmationCode);

    // Step 2: Add user to our internal store (they're now verified)
    // We need to get their email somehow - let's assume it was stored during registration
    const email = `${username}@example.com`; // Default - will be updated when user logs in
    const user = await userStore.addUser(username, email, `cognito_${username}`);

    res.json({
      message: 'Account verified successfully. You can now log in.',
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

export const resendConfirmationCode = async (req, res) => {
  try {
    const { username } = req.validatedBody;

    await cognitoService.resendConfirmationCode(username);

    res.json({
      message: 'Verification code sent to your email.'
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};
