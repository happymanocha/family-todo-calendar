/**
 * Main Router
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const todoRoutes = require('./todos');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API information endpoint
router.get('/info', (req, res) => {
    res.status(200).json({
        name: "Minocha's Organizer API",
        description: 'Complete family organization API with task and meeting management',
        version: '1.0.0',
        author: 'Minocha Family',
        features: [
            'JWT Authentication with refresh tokens',
            'Role-based access control',
            'Task workflow management (pending → in-progress → completed)',
            'Meeting scheduling with time ranges and agenda',
            'Family member assignments and collaboration',
            'Advanced filtering and search capabilities',
            'Real-time statistics and analytics',
            'Comments and activity tracking',
            'Tag-based organization',
            'Bulk operations support',
            'OpenAPI 3.0 documentation'
        ],
        technology: {
            framework: 'Express.js',
            authentication: 'JWT (JSON Web Tokens)',
            validation: 'Joi schema validation',
            documentation: 'OpenAPI 3.0 (Swagger)',
            architecture: 'MVC with service layer',
            security: 'CORS, Helmet, Rate limiting'
        },
        endpoints: {
            authentication: '/api/auth/*',
            todos: '/api/todos/*',
            documentation: '/api-docs',
            health: '/api/health'
        }
    });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/todos', todoRoutes);

// Catch-all for undefined API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        availableEndpoints: {
            health: 'GET /api/health',
            info: 'GET /api/info',
            authentication: 'POST /api/auth/login',
            todos: 'GET /api/todos',
            documentation: 'GET /api-docs'
        }
    });
});

module.exports = router;