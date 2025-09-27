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

export async function loadDynamoConfig () {
  if (!configPromise) {
    configPromise = (async () => ({
      REGION,
      TABLE: await getParam('/n11817143/app/dynamoTable'),
      OWNER_INDEX: await getParam('/n11817143/app/dynamoOwnerIndex')
    }))();
  }
  return configPromise;
}
