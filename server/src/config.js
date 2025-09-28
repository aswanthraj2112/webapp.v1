import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJWTSecret } from './utils/secrets.js';
import { loadAppConfig } from './utils/parameterStore.js';

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
  PUBLIC_DIR: resolveFromRoot(process.env.PUBLIC_DIR || './src/public'),
  CLIENT_ORIGINS: parsedOrigins,
  USE_LOCAL_STORAGE: false, // Force S3 storage only

  // Parameter Store configurations (will be loaded)
  COGNITO_CLIENT_ID: null,
  COGNITO_USER_POOL_ID: null,
  DOMAIN_NAME: null,
  DYNAMO_TABLE: null,
  DYNAMO_OWNER_INDEX: null,
  MAX_UPLOAD_SIZE_MB: null,
  PRESIGNED_URL_TTL: null,
  S3_BUCKET: null,
  S3_RAW_PREFIX: null,
  S3_THUMBNAIL_PREFIX: null,
  S3_TRANSCODED_PREFIX: null,

  // Legacy compatibility
  get LIMIT_FILE_SIZE_MB() {
    return this.MAX_UPLOAD_SIZE_MB || Number.parseInt(process.env.LIMIT_FILE_SIZE_MB || '512', 10);
  },

  // Computed properties for backward compatibility (only used for temp files during transcoding)
  get PUBLIC_VIDEOS_DIR() {
    return path.join(this.PUBLIC_DIR, 'videos');
  },

  get PUBLIC_THUMBS_DIR() {
    return path.join(this.PUBLIC_DIR, 'thumbs');
  }
};

// Initialize all configurations
config.initialize = async function () {
  try {
    // Load Parameter Store configuration
    const paramConfig = await loadAppConfig();
    Object.assign(this, paramConfig);

    // Load JWT secret from AWS Secrets Manager
    this.JWT_SECRET = await getJWTSecret();
    console.log('✅ JWT secret loaded from AWS Secrets Manager');

    console.log('✅ All configurations loaded successfully');

    // Log configuration summary (without sensitive data)
    console.log('📋 Configuration Summary:');
    console.log(`   - Domain: ${this.DOMAIN_NAME}`);
    console.log(`   - S3 Bucket: ${this.S3_BUCKET}`);
    console.log(`   - DynamoDB Table: ${this.DYNAMO_TABLE}`);
    console.log(`   - Max Upload Size: ${this.MAX_UPLOAD_SIZE_MB}MB`);
    console.log(`   - Presigned URL TTL: ${this.PRESIGNED_URL_TTL}s`);

  } catch (error) {
    console.error('❌ Failed to load configurations:', error.message);

    // Fallback to environment variables
    console.log('⚠️  Using fallback configuration from environment variables');
    this.JWT_SECRET = process.env.JWT_SECRET || 'change_me';
    this.MAX_UPLOAD_SIZE_MB = Number.parseInt(process.env.LIMIT_FILE_SIZE_MB || '512', 10);
    this.PRESIGNED_URL_TTL = Number.parseInt(process.env.PRESIGNED_URL_TTL || '600', 10);

    throw error;
  }
};

// Legacy method for backward compatibility
config.initializeSecrets = async function () {
  console.warn('⚠️  initializeSecrets() is deprecated. Use initialize() instead.');
  await this.initialize();
};

config.CLIENT_ORIGIN = config.CLIENT_ORIGINS[0];

export default config;
