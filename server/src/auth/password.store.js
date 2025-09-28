import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

// Simple password store for users who registered via Cognito
class PasswordStore {
    constructor() {
        this.passwordsFile = path.join(process.cwd(), 'data', 'user-passwords.json');
        this.passwords = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Ensure data directory exists
            await fs.mkdir(path.dirname(this.passwordsFile), { recursive: true });

            // Load existing passwords
            const data = await fs.readFile(this.passwordsFile, 'utf8');
            const passwords = JSON.parse(data);
            this.passwords = new Map(Object.entries(passwords));
        } catch (error) {
            // File doesn't exist yet, start with empty store
            this.passwords = new Map();
        }

        this.initialized = true;
    }

    async savePasswords() {
        const passwordsObj = Object.fromEntries(this.passwords);
        await fs.writeFile(this.passwordsFile, JSON.stringify(passwordsObj, null, 2));
    }

    async setPassword(username, plainPassword) {
        await this.initialize();

        const hashedPassword = await bcrypt.hash(plainPassword, 12);
        this.passwords.set(username.toLowerCase(), {
            hash: hashedPassword,
            updatedAt: new Date().toISOString()
        });

        await this.savePasswords();
    }

    async verifyPassword(username, plainPassword) {
        await this.initialize();

        const passwordData = this.passwords.get(username.toLowerCase());
        if (!passwordData) {
            return false;
        }

        return await bcrypt.compare(plainPassword, passwordData.hash);
    }

    async hasPassword(username) {
        await this.initialize();
        return this.passwords.has(username.toLowerCase());
    }

    async removePassword(username) {
        await this.initialize();
        const deleted = this.passwords.delete(username.toLowerCase());
        if (deleted) {
            await this.savePasswords();
        }
        return deleted;
    }
}

export default new PasswordStore();