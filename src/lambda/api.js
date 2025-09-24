/**
 * API Health and Info Lambda Functions
 * Provides health check and application information endpoints
 */

const { lambdaWrapper, successResponse } = require('../utils/lambda-utils');

/**
 * Health check endpoint
 */
const health = lambdaWrapper(async (event) => {
    const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        region: process.env.AWS_REGION || 'us-east-1',
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        services: {
            dynamodb: 'operational',
            lambda: 'operational',
            apigateway: 'operational'
        }
    };

    return successResponse(healthData, 'Health check successful');
});

/**
 * Application info endpoint
 */
const info = lambdaWrapper(async (event) => {
    const infoData = {
        name: 'Minocha Family Organizer',
        description: 'A serverless family todo and task management application',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        architecture: 'serverless',
        services: {
            compute: 'AWS Lambda',
            database: 'Amazon DynamoDB',
            api: 'Amazon API Gateway',
            storage: 'Amazon S3',
            cdn: 'Amazon CloudFront'
        },
        features: [
            'User Authentication',
            'Todo Management',
            'Task Assignment',
            'Calendar Views',
            'Real-time Updates',
            'Search and Filtering',
            'Statistics Dashboard',
            'Mobile Responsive'
        ],
        apiVersion: 'v1',
        documentation: '/api/docs',
        healthCheck: '/api/health',
        endpoints: {
            auth: {
                login: '/api/auth/login',
                logout: '/api/auth/logout',
                profile: '/api/auth/profile',
                refresh: '/api/auth/refresh',
                validate: '/api/auth/validate',
                familyMembers: '/api/auth/family-members',
                checkPermission: '/api/auth/check-permission'
            },
            todos: {
                list: '/api/todos',
                create: '/api/todos',
                get: '/api/todos/{id}',
                update: '/api/todos/{id}',
                delete: '/api/todos/{id}',
                updateStatus: '/api/todos/{id}/status',
                addComment: '/api/todos/{id}/comments',
                search: '/api/todos/search',
                statistics: '/api/todos/statistics',
                upcoming: '/api/todos/upcoming',
                bulkUpdate: '/api/todos/bulk'
            }
        },
        timestamp: new Date().toISOString()
    };

    return successResponse(infoData, 'Application information retrieved successfully');
});

module.exports = {
    health,
    info
};