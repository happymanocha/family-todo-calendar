/**
 * Minocha's Organizer - Main Application Server
 * Express.js application with MVC architecture
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import configurations
const databaseConfig = require('./src/config/database');
const { specs, swaggerUi, swaggerOptions } = require('./src/config/swagger');

// Import middleware
const { requestLogger, apiLogger, performanceLogger } = require('./src/middleware/logger');
const { errorLogger, errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import routes
const apiRoutes = require('./src/routes');
const ViewController = require('./src/views/ViewController');

const app = express();

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "data:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"]
        }
    }
}));

// Enable CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enable gzip compression
app.use(compression());

// Body parsing middleware
app.use(express.json({
    limit: '10mb',
    type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// Request logging
app.use(requestLogger);
app.use(performanceLogger('Request'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    setHeaders: (res, filePath) => {
        // Set cache headers for different file types
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', process.env.NODE_ENV === 'production'
                ? 'public, max-age=31536000' // 1 year in production
                : 'public, max-age=0'        // No cache in development
            );
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
        }
    }
}));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// API Routes with logging
app.use('/api', apiLogger, apiRoutes);

// Frontend Routes (Views)
app.get('/', ViewController.serveApp);
app.get('/login', ViewController.serveLogin);
app.get('/logout', ViewController.serveLogout);

// Handle client-side routing for SPA
app.get('/app/*', ViewController.handleSPA);
app.get('/dashboard/*', ViewController.handleSPA);

// Development routes
if (process.env.NODE_ENV === 'development') {
    app.get('/dev/routes', (req, res) => {
        const routes = [];

        function extractRoutes(stack, prefix = '') {
            stack.forEach(layer => {
                if (layer.route) {
                    const methods = Object.keys(layer.route.methods);
                    routes.push({
                        path: prefix + layer.route.path,
                        methods: methods.map(m => m.toUpperCase()),
                        type: 'route'
                    });
                } else if (layer.name === 'router') {
                    const routerPrefix = layer.regexp.source
                        .replace('\\', '')
                        .replace('/?$', '')
                        .replace('?(?=\\/|$)', '')
                        .replace(/\\\//g, '/');

                    if (layer.handle.stack) {
                        extractRoutes(layer.handle.stack, prefix + routerPrefix);
                    }
                }
            });
        }

        extractRoutes(app._router.stack);

        res.json({
            success: true,
            message: 'Available routes',
            data: routes.sort((a, b) => a.path.localeCompare(b.path))
        });
    });
}

// Error handling middleware (must be last)
app.use(errorLogger);

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// 404 handler for frontend routes
app.use('*', ViewController.serve404);

// Global error handler
app.use(errorHandler);

/**
 * Initialize application
 */
async function initializeApp() {
    try {
        // Initialize database connection
        const dbConnected = await databaseConfig.connect();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database');
            process.exit(1);
        }

        console.log('✅ Application initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        process.exit(1);
    }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

    try {
        // Close database connection
        await databaseConfig.disconnect();
        console.log('✅ Database connection closed');

        console.log('✅ Server shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Initialize and export app
initializeApp().then(() => {
    console.log('🚀 Minocha\'s Organizer - MVC Architecture Ready');
});

module.exports = app;