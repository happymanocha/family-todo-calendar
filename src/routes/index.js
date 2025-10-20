/**
 * Main Router
 * Combines all route modules with API versioning
 */

const express = require('express');
const router = express.Router();
const { versionMiddleware } = require('../middleware/apiVersion');

// Import versioned route modules
const v1Routes = require('./v1');

// Apply API version middleware
router.use(versionMiddleware({
    supportedVersions: ['v1'],
    defaultVersion: 'v1',
    deprecatedVersions: [],
    headerName: 'X-API-Version'
}));

// Global health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        apiVersion: req.apiVersion || 'v1',
        appVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API information endpoint
router.get('/info', (req, res) => {
    res.status(200).json({
        name: "Nest Family Organizer API",
        description: 'Complete family organization API with task and meeting management',
        version: '1.0.0',
        apiVersion: req.apiVersion || 'v1',
        supportedVersions: ['v1'],
        author: 'hmanocha',
        features: [
            'API Versioning (v1)',
            'JWT Authentication with refresh tokens',
            'Token blacklisting for secure logout',
            'Role-based access control (Admin/Member)',
            'Rate limiting and DDoS protection',
            'Input sanitization and XSS prevention',
            'Task workflow management',
            'Meeting scheduling with agenda',
            'Family management with invite codes',
            'Advanced filtering and search',
            'Statistics and analytics',
            'Comments and activity tracking',
            'Tag-based organization',
            'Bulk operations',
            'OpenAPI 3.0 documentation'
        ],
        technology: {
            framework: 'Express.js',
            authentication: 'JWT with blacklist',
            validation: 'Joi schema validation',
            documentation: 'OpenAPI 3.0 (Swagger)',
            architecture: 'MVC with service layer',
            security: 'CORS, Helmet, Rate limiting, Input sanitization'
        },
        endpoints: {
            authentication: '/api/v1/auth/*',
            todos: '/api/v1/todos/*',
            families: '/api/v1/families/*',
            documentation: '/api-docs',
            health: '/api/health'
        }
    });
});

// Mount versioned routes
router.use('/v1', v1Routes);

// Default routes (redirect to v1 for backward compatibility)
router.use('/auth', (req, res, next) => {
    req.url = '/v1/auth' + req.url;
    v1Routes(req, res, next);
});
router.use('/todos', (req, res, next) => {
    req.url = '/v1/todos' + req.url;
    v1Routes(req, res, next);
});
router.use('/families', (req, res, next) => {
    req.url = '/v1/families' + req.url;
    v1Routes(req, res, next);
});

// Catch-all for undefined API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.originalUrl,
        apiVersion: req.apiVersion || 'v1',
        availableEndpoints: {
            health: 'GET /api/health',
            info: 'GET /api/info',
            authentication: 'POST /api/v1/auth/login',
            register: 'POST /api/v1/auth/register',
            todos: 'GET /api/v1/todos',
            families: 'GET /api/v1/families',
            documentation: 'GET /api-docs'
        },
        hint: 'Try using versioned endpoints: /api/v1/...'
    });
});

module.exports = router;