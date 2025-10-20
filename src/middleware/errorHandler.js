/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

/**
 * Custom API Error class for operational errors
 */
class APIError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

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

    // Build standardized response
    const response = {
        success: false,
        message,
        code,
        timestamp: new Date().toISOString(),
        path: req.originalUrl || req.url
    };

    // Add request ID if available
    if (req.id) {
        response.requestId = req.id;
    }

    // Add validation/additional details if present
    if (error.details) {
        response.details = error.details;
    }

    // Include error stack in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
        response.stack = error.stack.split('\n').map(line => line.trim());
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

/**
 * Common error creators for consistency across the application
 */
const errors = {
    badRequest: (message = 'Bad request', details = null) =>
        new APIError(message, 400, 'BAD_REQUEST', details),

    unauthorized: (message = 'Unauthorized') =>
        new APIError(message, 401, 'UNAUTHORIZED'),

    forbidden: (message = 'Forbidden - insufficient permissions') =>
        new APIError(message, 403, 'FORBIDDEN'),

    notFound: (message = 'Resource not found') =>
        new APIError(message, 404, 'NOT_FOUND'),

    conflict: (message = 'Resource conflict') =>
        new APIError(message, 409, 'CONFLICT'),

    unprocessable: (message = 'Unprocessable entity', details = null) =>
        new APIError(message, 422, 'UNPROCESSABLE_ENTITY', details),

    tooManyRequests: (message = 'Too many requests, please try again later') =>
        new APIError(message, 429, 'TOO_MANY_REQUESTS'),

    internal: (message = 'Internal server error') =>
        new APIError(message, 500, 'INTERNAL_ERROR'),

    serviceUnavailable: (message = 'Service temporarily unavailable') =>
        new APIError(message, 503, 'SERVICE_UNAVAILABLE')
};

module.exports = {
    APIError,
    errorLogger,
    errorHandler,
    notFoundHandler,
    asyncHandler,
    errors
};