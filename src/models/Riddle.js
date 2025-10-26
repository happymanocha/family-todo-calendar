/**
 * Riddle Model
 * DynamoDB model for storing daily family riddles
 * Falls back to in-memory storage for local development
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

// Determine if we're in local development
const isLocalDev =
  process.env.NODE_ENV === 'development' ||
  process.env.IS_OFFLINE === 'true' ||
  !process.env.AWS_REGION;

// In-memory storage for local development
const localStore = new Map();

// DynamoDB setup for production
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'nest-family-organizer-dev';

class Riddle {
  /**
   * Create a new riddle for a family
   */
  static async create(familyId, riddleData) {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const riddleItem = {
      PK: `FAMILY#${familyId}`,
      SK: `RIDDLE#${today}`,
      entityType: 'Riddle',
      familyId,
      date: today,
      riddle: riddleData.riddle,
      answer: riddleData.answer,
      hint1: riddleData.hint1,
      hint2: riddleData.hint2,
      hint3: riddleData.hint3,
      category: riddleData.category,
      difficulty: riddleData.estimatedDifficulty,
      metadata: riddleData.metadata || {},
      viewedBy: [],
      solvedBy: [],
      hintsUsed: {},
      createdAt: now,
      updatedAt: now,
      TTL: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    if (isLocalDev) {
      // Local development: use in-memory storage
      const key = `${riddleItem.PK}#${riddleItem.SK}`;
      if (localStore.has(key)) {
        return localStore.get(key);
      }
      localStore.set(key, riddleItem);
      return riddleItem;
    }

    // Production: use DynamoDB
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: riddleItem,
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );

      return riddleItem;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        return await Riddle.getToday(familyId);
      }
      throw error;
    }
  }

  /**
   * Get today's riddle
   * In dev/localdev: Returns null to force new riddle generation unless already solved
   * In production: Returns existing riddle if one exists for today (24-hour frequency)
   */
  static async getToday(familyId, userId = null) {
    const today = new Date().toISOString().split('T')[0];
    const PK = `FAMILY#${familyId}`;
    const SK = `RIDDLE#${today}`;

    if (isLocalDev) {
      // Local development: check if exists and is solved
      const key = `${PK}#${SK}`;
      const existingRiddle = localStore.get(key);

      if (existingRiddle && userId) {
        // If riddle is solved by this user, keep showing it
        if (existingRiddle.solvedBy?.includes(userId)) {
          return existingRiddle;
        }
        // Otherwise return null to force new generation on each load
        return null;
      }

      return existingRiddle || null;
    }

    // Production: use DynamoDB with 24-hour frequency
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK, SK },
      })
    );

    return result.Item || null;
  }

  /**
   * Mark as viewed by user
   */
  static async markViewed(familyId, userId) {
    const today = new Date().toISOString().split('T')[0];
    const PK = `FAMILY#${familyId}`;
    const SK = `RIDDLE#${today}`;

    if (isLocalDev) {
      // Local development: use in-memory storage
      const key = `${PK}#${SK}`;
      const riddle = localStore.get(key);
      if (riddle && !riddle.viewedBy.includes(userId)) {
        riddle.viewedBy.push(userId);
        riddle.updatedAt = new Date().toISOString();
        localStore.set(key, riddle);
      }
      return;
    }

    // Production: use DynamoDB
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK, SK },
        UpdateExpression:
          'SET viewedBy = list_append(if_not_exists(viewedBy, :empty), :userId), updatedAt = :now',
        ExpressionAttributeValues: {
          ':userId': [userId],
          ':empty': [],
          ':now': new Date().toISOString(),
        },
      })
    );
  }

  /**
   * Mark as solved by user
   */
  static async markSolved(familyId, userId) {
    const today = new Date().toISOString().split('T')[0];
    const PK = `FAMILY#${familyId}`;
    const SK = `RIDDLE#${today}`;

    if (isLocalDev) {
      // Local development: use in-memory storage
      const key = `${PK}#${SK}`;
      const riddle = localStore.get(key);
      if (riddle && !riddle.solvedBy.includes(userId)) {
        riddle.solvedBy.push(userId);
        riddle.updatedAt = new Date().toISOString();
        localStore.set(key, riddle);
      }
      return;
    }

    // Production: use DynamoDB
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK, SK },
        UpdateExpression:
          'SET solvedBy = list_append(if_not_exists(solvedBy, :empty), :userId), updatedAt = :now',
        ExpressionAttributeValues: {
          ':userId': [userId],
          ':empty': [],
          ':now': new Date().toISOString(),
        },
      })
    );
  }

  /**
   * Delete today's riddle to allow generation of a new one
   */
  static async deleteToday(familyId) {
    const today = new Date().toISOString().split('T')[0];
    const PK = `FAMILY#${familyId}`;
    const SK = `RIDDLE#${today}`;

    if (isLocalDev) {
      // Local development: delete from in-memory storage
      const key = `${PK}#${SK}`;
      localStore.delete(key);
      console.log(`[Riddle] Deleted local riddle: ${key}`);
      return;
    }

    // Production: delete from DynamoDB
    const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK, SK },
      })
    );
    console.log(`[Riddle] Deleted DynamoDB riddle: ${PK} ${SK}`);
  }
}

module.exports = Riddle;
