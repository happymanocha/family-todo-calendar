/**
 * Lambda Utility Functions
 * Common utilities for Lambda function responses and error handling
 */

const jwt = require('jsonwebtoken');

/**
 * Create standardized API response
 */
const createResponse = (statusCode, body, headers = {}) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Credentials': true,
            ...headers
        },
        body: JSON.stringify(body)
    };
};

/**
 * Create success response
 */
const successResponse = (data, message = 'Success', statusCode = 200) => {
    return createResponse(statusCode, {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Create error response
 */
const errorResponse = (message, statusCode = 500, code = 'SERVER_ERROR', details = null) => {
    const errorBody = {
        success: false,
        message,
        code,
        timestamp: new Date().toISOString()
    };

    if (details && process.env.NODE_ENV === 'development') {
        errorBody.details = details;
    }

    return createResponse(statusCode, errorBody);
};

/**
 * Validate required fields in request body
 */
const validateRequiredFields = (body, requiredFields) => {
    const missingFields = [];

    for (const field of requiredFields) {
        if (!body[field]) {
            missingFields.push(field);
        }
    }

    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
};

/**
 * Parse request body safely
 */
const parseBody = (event) => {
    try {
        return event.body ? JSON.parse(event.body) : {};
    } catch (error) {
        throw new Error('Invalid JSON in request body');
    }
};

/**
 * Extract JWT token from Authorization header
 */
const extractToken = (event) => {
    const authHeader = event.headers.Authorization || event.headers.authorization;

    if (!authHeader) {
        throw new Error('Authorization header is required');
    }

    if (!authHeader.startsWith('Bearer ')) {
        throw new Error('Invalid authorization header format. Expected: Bearer <token>');
    }

    return authHeader.substring(7);
};

/**
 * Verify JWT token and extract user info
 */
const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
};

/**
 * Get authenticated user from event
 */
const getAuthenticatedUser = (event) => {
    const token = extractToken(event);
    return verifyToken(token);
};

/**
 * Validate pagination parameters
 */
const validatePagination = (queryParams) => {
    const page = parseInt(queryParams.page) || 1;
    const limit = Math.min(parseInt(queryParams.limit) || 20, 100); // Max 100 items per page
    const offset = (page - 1) * limit;

    return { page, limit, offset };
};

/**
 * Handle CORS preflight requests
 */
const handleCors = (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, {}, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'Access-Control-Max-Age': '86400'
        });
    }
    return null;
};

/**
 * Lambda function wrapper with error handling
 */
const lambdaWrapper = (handler) => {
    return async (event, context) => {
        try {
            // Handle CORS preflight
            const corsResponse = handleCors(event);
            if (corsResponse) {
                return corsResponse;
            }

            // Call the actual handler
            const result = await handler(event, context);

            // Ensure result is properly formatted
            if (result && typeof result === 'object' && result.statusCode) {
                return result;
            }

            // If handler returns data directly, wrap it in success response
            return successResponse(result);

        } catch (error) {
            console.error('Lambda execution error:', error);

            // Handle known error types
            if (error.message.includes('Missing required fields')) {
                return errorResponse(error.message, 400, 'VALIDATION_ERROR');
            }

            if (error.message.includes('Authorization header') ||
                error.message.includes('Token') ||
                error.message.includes('Invalid token')) {
                return errorResponse(error.message, 401, 'UNAUTHORIZED');
            }

            if (error.message.includes('Not found') ||
                error.message.includes('does not exist')) {
                return errorResponse(error.message, 404, 'NOT_FOUND');
            }

            if (error.message.includes('already exists') ||
                error.message.includes('Duplicate')) {
                return errorResponse(error.message, 409, 'CONFLICT');
            }

            // Generic server error
            return errorResponse(
                process.env.NODE_ENV === 'production'
                    ? 'Internal server error'
                    : error.message,
                500,
                'SERVER_ERROR',
                process.env.NODE_ENV === 'development' ? error.stack : null
            );
        }
    };
};

/**
 * Generate unique ID using timestamp and random string
 */
const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Sanitize user input by removing sensitive fields
 */
const sanitizeInput = (input, sensitiveFields = ['password', 'token', 'secret']) => {
    const sanitized = { ...input };
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            delete sanitized[field];
        }
    });
    return sanitized;
};

/**
 * Format date for DynamoDB storage
 */
const formatDate = (date) => {
    if (!date) return null;

    if (typeof date === 'string') {
        return date;
    }

    if (date instanceof Date) {
        return date.toISOString().split('T')[0];
    }

    return null;
};

/**
 * Create pagination response
 */
const createPaginatedResponse = (items, pagination, totalCount = null) => {
    const response = {
        items,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: items.length
        }
    };

    if (totalCount !== null) {
        response.pagination.totalCount = totalCount;
        response.pagination.totalPages = Math.ceil(totalCount / pagination.limit);
        response.pagination.hasNext = pagination.page < response.pagination.totalPages;
        response.pagination.hasPrevious = pagination.page > 1;
    }

    return response;
};

module.exports = {
    createResponse,
    successResponse,
    errorResponse,
    validateRequiredFields,
    parseBody,
    extractToken,
    verifyToken,
    getAuthenticatedUser,
    validatePagination,
    handleCors,
    lambdaWrapper,
    generateId,
    sanitizeInput,
    formatDate,
    createPaginatedResponse
};