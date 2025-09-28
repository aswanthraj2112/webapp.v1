import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../data/cognito-users.json');

class HybridUserStore {
    constructor() {
        this.users = new Map();
        this.initializeStore();
    }

    async initializeStore() {
        try {
            await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });

            try {
                const data = await fs.readFile(USERS_FILE, 'utf8');
                const usersArray = JSON.parse(data);
                this.users = new Map(usersArray.map(user => [user.username, user]));
                console.log(`✅ Loaded ${this.users.size} verified Cognito users`);
            } catch (error) {
                // File doesn't exist yet, start with empty store
                console.log('📝 Initializing new user store for Cognito users');
                await this.saveStore();
            }
        } catch (error) {
            console.error('❌ Failed to initialize user store:', error);
        }
    }

    async saveStore() {
        try {
            const usersArray = Array.from(this.users.values());
            await fs.writeFile(USERS_FILE, JSON.stringify(usersArray, null, 2));
        } catch (error) {
            console.error('❌ Failed to save user store:', error);
        }
    }

    /**
     * Add a verified Cognito user to local store
     */
    async addVerifiedUser(username, password, email, cognitoSub) {
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = {
            id: cognitoSub || `cognito_${username}`,
            username,
            email,
            passwordHash: hashedPassword,
            verified: true,
            createdAt: new Date().toISOString(),
            source: 'cognito'
        };

        this.users.set(username, user);
        await this.saveStore();

        console.log(`✅ Added verified Cognito user: ${username}`);
        return user;
    }

    /**
     * Authenticate user with stored credentials
     */
    async authenticateUser(username, password) {
        const user = this.users.get(username);

        if (!user) {
            throw new Error('User not found. Please register first.');
        }

        if (!user.verified) {
            throw new Error('Account not verified. Please confirm your email.');
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
            throw new Error('Invalid password.');
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            verified: user.verified,
            source: user.source
        };
    }

    /**
     * Mark a user as verified (after Cognito confirmation)
     */
    async markUserAsVerified(username) {
        const user = this.users.get(username);
        if (user) {
            user.verified = true;
            await this.saveStore();
            console.log(`✅ User verified: ${username}`);
        }
    }

    /**
     * Check if user exists
     */
    hasUser(username) {
        return this.users.has(username);
    }

    /**
     * Get user by username
     */
    getUser(username) {
        return this.users.get(username);
    }
}

export default new HybridUserStore();