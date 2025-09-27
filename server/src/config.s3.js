import { getParameters, getParameterWithDefault } from './utils/parameterStore.js';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
let configPromise;

export async function loadS3Config() {
  if (!configPromise) {
    configPromise = (async () => {
      try {
        const params = await getParameters([
          's3Bucket',
          's3_raw_prefix',
          's3_transcoded_prefix',
          's3_thumbnail_prefix'
        ]);

        const preSignedTTL = await getParameterWithDefault('preSignedUrlTTL', '600');

        return {
          REGION,
          S3_BUCKET: params.s3Bucket,
          RAW_PREFIX: params.s3_raw_prefix,
          TRANSCODED_PREFIX: params.s3_transcoded_prefix,
          THUMB_PREFIX: params.s3_thumbnail_prefix,
          PRESIGNED_TTL_SECONDS: Number.parseInt(preSignedTTL, 10)
        };
      } catch (error) {
        console.error('❌ Failed to load S3 configuration from Parameter Store:', error.message);
        throw error;
      }
    })();
  }
  return configPromise;
}
