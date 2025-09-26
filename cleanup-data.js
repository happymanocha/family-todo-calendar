/**
 * Data Cleanup Script
 * Clears all data from DynamoDB tables for fresh testing
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

// Create DynamoDB client
const dynamoClient = new DynamoDBClient({
    region: 'us-east-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Possible table name patterns
const TABLE_PATTERNS = [
    'minocha-organizer-serverless-todos-dev',
    'minocha-organizer-serverless-users-dev',
    'minocha-organizer-serverless-families-dev',
    // Alternative naming patterns
    'minocha-organizer-todos-dev',
    'minocha-organizer-users-dev',
    'minocha-organizer-families-dev',
    // Just in case
    'todos-dev',
    'users-dev',
    'families-dev'
];

async function clearTable(tableName) {
    try {
        console.log(`🧹 Clearing table: ${tableName}`);

        // Scan all items
        const scanResult = await docClient.send(new ScanCommand({
            TableName: tableName
        }));

        if (!scanResult.Items || scanResult.Items.length === 0) {
            console.log(`  ✅ Table ${tableName} is already empty`);
            return;
        }

        console.log(`  📋 Found ${scanResult.Items.length} items to delete`);

        // Delete items in batches of 25 (DynamoDB limit)
        const batchSize = 25;
        for (let i = 0; i < scanResult.Items.length; i += batchSize) {
            const batch = scanResult.Items.slice(i, i + batchSize);

            const deleteRequests = batch.map(item => {
                // Get the primary key based on table and available fields
                let key;
                if (tableName.includes('todos')) {
                    key = { id: item.id };
                } else if (tableName.includes('users')) {
                    // Users table primary key is 'id'
                    key = { id: item.id };
                } else if (tableName.includes('families')) {
                    key = { familyId: item.familyId };
                } else {
                    // For unknown tables, try common key patterns
                    key = item.id ? { id: item.id } :
                          item.familyId ? { familyId: item.familyId } :
                          item.email ? { email: item.email } :
                          Object.keys(item)[0] ? { [Object.keys(item)[0]]: item[Object.keys(item)[0]] } : {};
                }

                return {
                    DeleteRequest: { Key: key }
                };
            });

            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [tableName]: deleteRequests
                }
            }));

            console.log(`  🗑️  Deleted batch ${Math.floor(i/batchSize) + 1}`);
        }

        console.log(`  ✅ Cleared table: ${tableName}`);

    } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
            console.log(`  ⚠️  Table ${tableName} doesn't exist - skipping`);
        } else {
            console.error(`  ❌ Error clearing table ${tableName}:`, error.message);
        }
    }
}

async function main() {
    console.log('🚀 Starting comprehensive data cleanup...\n');

    // First, let's see what tables actually exist
    try {
        const { TableNames } = await docClient.send(new (require('@aws-sdk/client-dynamodb').ListTablesCommand)({}));
        console.log('📋 Found existing tables:', TableNames);

        // Clear all existing tables
        for (const tableName of TableNames) {
            await clearTable(tableName);
        }
    } catch (error) {
        console.log('❌ Could not list tables:', error.message);
    }

    // Also try our known patterns in case some tables exist but weren't listed
    console.log('\n🔍 Checking known table patterns...');
    for (const tableName of TABLE_PATTERNS) {
        await clearTable(tableName);
    }

    console.log('\n✅ Comprehensive data cleanup complete! Ready for fresh testing.');
}

main().catch(console.error);