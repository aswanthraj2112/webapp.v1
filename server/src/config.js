import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJWTSecret } from './utils/secrets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const resolveFromRoot = (maybeRelative) =>
  path.isAbsolute(maybeRelative)
    ? maybeRelative
    : path.resolve(rootDir, maybeRelative);

const defaultOrigin = 'http://n11817143-videoapp.cab432.com';
const rawOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN;

const parsedOrigins = rawOrigins
  ? rawOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  : [];

if (parsedOrigins.length === 0) {
  parsedOrigins.push(defaultOrigin);
}

const config = {
  PORT: Number.parseInt(process.env.PORT || '8080', 10),
  JWT_SECRET: null, // Will be loaded from Secrets Manager
  TOKEN_EXPIRY: process.env.TOKEN_EXPIRY || '1h',
  DB_FILE: resolveFromRoot(process.env.DB_FILE || './data.sqlite'),
  PUBLIC_DIR: resolveFromRoot(process.env.PUBLIC_DIR || './src/public'),
  CLIENT_ORIGINS: parsedOrigins,
  LIMIT_FILE_SIZE_MB: Number.parseInt(process.env.LIMIT_FILE_SIZE_MB || '512', 10),
  USE_LOCAL_STORAGE: process.env.USE_LOCAL_STORAGE === 'true'
};

// Load JWT secret from AWS Secrets Manager
config.initializeSecrets = async function () {
  try {
    this.JWT_SECRET = await getJWTSecret();
    console.log('✅ JWT secret loaded from AWS Secrets Manager');
  } catch (error) {
    console.error('❌ Failed to load JWT secret from Secrets Manager:', error.message);
    this.JWT_SECRET = process.env.JWT_SECRET || 'change_me';
    console.log('⚠️  Using fallback JWT secret from environment');
  }
};

config.CLIENT_ORIGIN = config.CLIENT_ORIGINS[0];

config.PUBLIC_VIDEOS_DIR = path.join(config.PUBLIC_DIR, 'videos');
config.PUBLIC_THUMBS_DIR = path.join(config.PUBLIC_DIR, 'thumbs');

export default config;
