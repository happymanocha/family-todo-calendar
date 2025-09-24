/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

/**
 * Error logging middleware
 */
const errorLogger = (error, req, res, next) => {
    // Log error details
    console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.userId || 'anonymous'
    });

    next(error);
};

/**
 * Main error handler
 */
const errorHandler = (error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    let code = error.code || 'SERVER_ERROR';

    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        code = 'VALIDATION_ERROR';
    } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
        code = 'UNAUTHORIZED';
    } else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    } else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    } else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
        code = 'INVALID_ID';
    }

    // Don't expose internal error details in production
    const response = {
        success: false,
        message,
        code,
        timestamp: new Date().toISOString()
    };

    // Include error details in development
    if (process.env.NODE_ENV === 'development') {
        response.error = {
            stack: error.stack,
            details: error
        };
    }

    res.status(statusCode).json(response);
};

/**
 * 404 handler for API routes
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Resource not found',
        code: 'NOT_FOUND',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    errorLogger,
    errorHandler,
    notFoundHandler,
    asyncHandler
};