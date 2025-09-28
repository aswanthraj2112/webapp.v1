import { getParameters } from './utils/parameterStore.js';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
let configPromise;

export async function loadDynamoConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      try {
        const params = await getParameters([
          'dynamoTable',
          'dynamoOwnerIndex'
        ]);

        return {
          REGION,
          TABLE: params.dynamoTable,
          OWNER_INDEX: params.dynamoOwnerIndex
        };
      } catch (error) {
        console.error('❌ Failed to load DynamoDB configuration from Parameter Store:', error.message);
        throw error;
      }
    })();
  }
  return configPromise;
}
