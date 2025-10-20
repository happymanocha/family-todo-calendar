/**
 * Riddle Model
 * DynamoDB model for storing daily family riddles
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

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
   */
  static async getToday(familyId) {
    const today = new Date().toISOString().split('T')[0];

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `RIDDLE#${today}`,
        },
      })
    );

    return result.Item || null;
  }

  /**
   * Mark as viewed by user
   */
  static async markViewed(familyId, userId) {
    const today = new Date().toISOString().split('T')[0];

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `RIDDLE#${today}`,
        },
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

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `RIDDLE#${today}`,
        },
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
}

module.exports = Riddle;
