/**
 * DynamoDB Client Configuration
 * Provides configured DynamoDB client for serverless operations
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient,
        GetCommand,
        PutCommand,
        UpdateCommand,
        DeleteCommand,
        QueryCommand,
        ScanCommand,
        BatchGetCommand,
        BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

// Create DynamoDB client
const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1'
});

// Create DynamoDB Document client for easier operations
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

// Table names from environment variables
const TODOS_TABLE = process.env.TODOS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * DynamoDB Operations Wrapper
 */
class DynamoService {
    constructor() {
        this.docClient = dynamoDocClient;
        this.todosTable = TODOS_TABLE;
        this.usersTable = USERS_TABLE;
    }

    // Generic operations
    async get(tableName, key) {
        const command = new GetCommand({
            TableName: tableName,
            Key: key
        });

        const response = await this.docClient.send(command);
        return response.Item;
    }

    async put(tableName, item) {
        const command = new PutCommand({
            TableName: tableName,
            Item: item
        });

        return await this.docClient.send(command);
    }

    async update(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) {
        const command = new UpdateCommand({
            TableName: tableName,
            Key: key,
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: Object.keys(expressionAttributeNames).length ? expressionAttributeNames : undefined,
            ReturnValues: 'ALL_NEW'
        });

        const response = await this.docClient.send(command);
        return response.Attributes;
    }

    async delete(tableName, key) {
        const command = new DeleteCommand({
            TableName: tableName,
            Key: key
        });

        return await this.docClient.send(command);
    }

    async query(tableName, indexName, keyConditionExpression, expressionAttributeValues, filterExpression = null) {
        const params = {
            TableName: tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues
        };

        if (indexName) {
            params.IndexName = indexName;
        }

        if (filterExpression) {
            params.FilterExpression = filterExpression;
        }

        const command = new QueryCommand(params);
        const response = await this.docClient.send(command);
        return response.Items;
    }

    async scan(tableName, filterExpression = null, expressionAttributeValues = {}) {
        const params = {
            TableName: tableName
        };

        if (filterExpression) {
            params.FilterExpression = filterExpression;
            params.ExpressionAttributeValues = expressionAttributeValues;
        }

        const command = new ScanCommand(params);
        const response = await this.docClient.send(command);
        return response.Items;
    }

    async batchGet(requestItems) {
        const command = new BatchGetCommand({
            RequestItems: requestItems
        });

        const response = await this.docClient.send(command);
        return response.Responses;
    }

    async batchWrite(requestItems) {
        const command = new BatchWriteCommand({
            RequestItems: requestItems
        });

        return await this.docClient.send(command);
    }

    // Todo-specific operations
    async getTodo(id) {
        return await this.get(this.todosTable, { id });
    }

    async putTodo(todo) {
        return await this.put(this.todosTable, todo);
    }

    async updateTodo(id, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) {
        return await this.update(this.todosTable, { id }, updateExpression, expressionAttributeValues, expressionAttributeNames);
    }

    async deleteTodo(id) {
        return await this.delete(this.todosTable, { id });
    }

    async getTodosByUser(userId, limit = 50) {
        return await this.query(
            this.todosTable,
            'UserIdIndex',
            'userId = :userId',
            { ':userId': userId }
        );
    }

    async getAllTodos() {
        return await this.scan(this.todosTable);
    }

    async getTodosByAssignee(assignedTo, dueDate = null) {
        let keyCondition = 'assignedTo = :assignedTo';
        let values = { ':assignedTo': assignedTo };

        if (dueDate) {
            keyCondition += ' AND dueDate = :dueDate';
            values[':dueDate'] = dueDate;
        }

        return await this.query(
            this.todosTable,
            'AssignedToIndex',
            keyCondition,
            values
        );
    }

    async getTodosByStatus(status, dueDate = null) {
        let keyCondition = '#status = :status';
        let values = { ':status': status };
        let attributeNames = { '#status': 'status' };

        if (dueDate) {
            keyCondition += ' AND dueDate = :dueDate';
            values[':dueDate'] = dueDate;
        }

        return await this.query(
            this.todosTable,
            'StatusIndex',
            keyCondition,
            values
        );
    }

    // User-specific operations
    async getUser(id) {
        return await this.get(this.usersTable, { id });
    }

    async getUserByEmail(email) {
        const users = await this.query(
            this.usersTable,
            'EmailIndex',
            'email = :email',
            { ':email': email }
        );
        return users.length > 0 ? users[0] : null;
    }

    async putUser(user) {
        return await this.put(this.usersTable, user);
    }

    async updateUser(id, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) {
        return await this.update(this.usersTable, { id }, updateExpression, expressionAttributeValues, expressionAttributeNames);
    }

    async deleteUser(id) {
        return await this.delete(this.usersTable, { id });
    }
}

module.exports = {
    DynamoService,
    TODOS_TABLE,
    USERS_TABLE
};