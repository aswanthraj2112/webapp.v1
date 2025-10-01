const AWS = require('aws-sdk');
const { loadConfig } = require('./config');

const documentClient = new AWS.DynamoDB.DocumentClient();
const inMemoryStore = new Map();

function getCompositeKey(userId, videoId) {
  return `${userId}#${videoId}`;
}

async function saveVideoMetadata({ userId, videoId, filename, status, createdAt }) {
  const config = await loadConfig();
  const tableName = config.dynamoTable;

  const item = {
    userId,
    videoId,
    filename,
    status,
    createdAt,
  };

  if (!tableName) {
    inMemoryStore.set(getCompositeKey(userId, videoId), item);
    return item;
  }

  const params = {
    TableName: tableName,
    Item: item,
  };

  try {
    await documentClient.put(params).promise();
    return item;
  } catch (error) {
    console.error('[dynamoService] Failed to write to DynamoDB, using in-memory store.', error);
    inMemoryStore.set(getCompositeKey(userId, videoId), item);
    return item;
  }
}

async function listVideosByUser(userId) {
  const config = await loadConfig();
  const tableName = config.dynamoTable;

  if (!tableName) {
    return Array.from(inMemoryStore.values()).filter((item) => item.userId === userId);
  }

  const params = {
    TableName: tableName,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  };

  try {
    const result = await documentClient.query(params).promise();
    return result.Items || [];
  } catch (error) {
    console.error('[dynamoService] Failed to query DynamoDB, using in-memory store.', error);
    return Array.from(inMemoryStore.values()).filter((item) => item.userId === userId);
  }
}

async function updateVideoStatus(userId, videoId, status) {
  const config = await loadConfig();
  const tableName = config.dynamoTable;

  if (!tableName) {
    const key = getCompositeKey(userId, videoId);
    const existing = inMemoryStore.get(key);
    if (existing) {
      existing.status = status;
      inMemoryStore.set(key, existing);
    }
    return existing;
  }

  const params = {
    TableName: tableName,
    Key: { userId, videoId },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': status,
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await documentClient.update(params).promise();
    return result.Attributes;
  } catch (error) {
    console.error('[dynamoService] Failed to update DynamoDB, using in-memory store.', error);
    const key = getCompositeKey(userId, videoId);
    const existing = inMemoryStore.get(key) || {};
    existing.status = status;
    inMemoryStore.set(key, existing);
    return existing;
  }
}

async function getVideo(userId, videoId) {
  const config = await loadConfig();
  const tableName = config.dynamoTable;

  if (!tableName) {
    return inMemoryStore.get(getCompositeKey(userId, videoId)) || null;
  }

  const params = {
    TableName: tableName,
    Key: { userId, videoId },
  };

  try {
    const result = await documentClient.get(params).promise();
    return result.Item || null;
  } catch (error) {
    console.error('[dynamoService] Failed to get from DynamoDB, using in-memory store.', error);
    return inMemoryStore.get(getCompositeKey(userId, videoId)) || null;
  }
}

module.exports = {
  saveVideoMetadata,
  listVideosByUser,
  updateVideoStatus,
  getVideo,
};
