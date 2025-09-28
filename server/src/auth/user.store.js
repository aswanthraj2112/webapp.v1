import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import config from '../config.js';

// Simple file-based user store for verified Cognito users
class UserStore {
    constructor() {
        this.usersFile = path.join(process.cwd(), 'data', 'cognito-users.json');
        this.users = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Ensure data directory exists
            await fs.mkdir(path.dirname(this.usersFile), { recursive: true });

            // Load existing users
            const data = await fs.readFile(this.usersFile, 'utf8');
            const users = JSON.parse(data);
            this.users = new Map(Object.entries(users));
        } catch (error) {
            // File doesn't exist yet, start with empty store
            this.users = new Map();
        }

        this.initialized = true;
    }

    async saveUsers() {
        const usersObj = Object.fromEntries(this.users);
        await fs.writeFile(this.usersFile, JSON.stringify(usersObj, null, 2));
    }

    async addUser(username, email, cognitoId) {
        await this.initialize();

        const userData = {
            id: cognitoId || `user_${Date.now()}`,
            username: username.toLowerCase(),
            email: email,
            createdAt: new Date().toISOString(),
            isVerified: true, // Only add users after Cognito confirmation
            source: 'cognito'
        };

        this.users.set(username.toLowerCase(), userData);
        await this.saveUsers();

        return userData;
    }

    async getUser(username) {
        await this.initialize();
        return this.users.get(username.toLowerCase());
    }

    async userExists(username) {
        await this.initialize();
        return this.users.has(username.toLowerCase());
    }

    async getAllUsers() {
        await this.initialize();
        return Array.from(this.users.values());
    }

    async removeUser(username) {
        await this.initialize();
        const deleted = this.users.delete(username.toLowerCase());
        if (deleted) {
            await this.saveUsers();
        }
        return deleted;
    }
}

export default new UserStore();