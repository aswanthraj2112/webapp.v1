import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const ssm = new SSMClient({ region: REGION });
const paramCache = new Map();
let configPromise;

async function getParam (Name) {
  if (paramCache.has(Name)) {
    return paramCache.get(Name);
  }
  const { Parameter } = await ssm.send(new GetParameterCommand({ Name }));
  paramCache.set(Name, Parameter.Value);
  return Parameter.Value;
}

async function getParamWithDefault(name, defaultValue) {
  try {
    return await getParam(name);
  } catch (error) {
    console.warn(`Parameter ${name} not found, using default: ${defaultValue}`);
    return defaultValue;
  }
}

export async function loadS3Config () {
  if (!configPromise) {
    configPromise = (async () => ({
      REGION,
      S3_BUCKET: await getParam('/n11817143/app/s3Bucket'),
      RAW_PREFIX: await getParam('/n11817143/app/s3_raw_prefix'),
      TRANSCODED_PREFIX: await getParam('/n11817143/app/s3_transcoded_prefix'),
      THUMB_PREFIX: await getParam('/n11817143/app/s3_thumbnail_prefix'),
      PRESIGNED_TTL_SECONDS: Number.parseInt(
        await getParamWithDefault('/n11817143/app/presigned_ttl_seconds', '3600'), 10
      )
    }))();
  }
  return configPromise;
}
