/**
 * HTTP Status Codes
 * Centralized status code constants and helper functions
 */

/**
 * Standard HTTP status codes
 */
const StatusCodes = {
    // Success 2xx
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,

    // Redirection 3xx
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    NOT_MODIFIED: 304,

    // Client Errors 4xx
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    CONFLICT: 409,
    GONE: 410,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,

    // Server Errors 5xx
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
};

/**
 * Status code descriptions
 */
const StatusMessages = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    409: 'Conflict',
    410: 'Gone',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
};

/**
 * Get status message for a code
 * @param {number} code HTTP status code
 * @returns {string} Status message
 */
const getStatusMessage = (code) => {
    return StatusMessages[code] || 'Unknown Status';
};

/**
 * Check if status code is successful (2xx)
 * @param {number} code HTTP status code
 * @returns {boolean} True if successful
 */
const isSuccess = (code) => {
    return code >= 200 && code < 300;
};

/**
 * Check if status code is a client error (4xx)
 * @param {number} code HTTP status code
 * @returns {boolean} True if client error
 */
const isClientError = (code) => {
    return code >= 400 && code < 500;
};

/**
 * Check if status code is a server error (5xx)
 * @param {number} code HTTP status code
 * @returns {boolean} True if server error
 */
const isServerError = (code) => {
    return code >= 500 && code < 600;
};

/**
 * Standardized response helper
 * Creates a consistent response object
 */
class ResponseBuilder {
    constructor(res) {
        this.res = res;
    }

    /**
     * Send successful response
     * @param {*} data Response data
     * @param {string} message Success message
     * @param {number} statusCode HTTP status code (default: 200)
     */
    success(data = null, message = 'Success', statusCode = StatusCodes.OK) {
        return this.res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Send resource created response (201)
     * @param {*} data Created resource data
     * @param {string} message Success message
     */
    created(data, message = 'Resource created successfully') {
        return this.success(data, message, StatusCodes.CREATED);
    }

    /**
     * Send no content response (204)
     */
    noContent() {
        return this.res.status(StatusCodes.NO_CONTENT).send();
    }

    /**
     * Send error response
     * @param {string} message Error message
     * @param {number} statusCode HTTP status code
     * @param {string} code Error code
     * @param {*} details Additional error details
     */
    error(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, code = 'ERROR', details = null) {
        const response = {
            success: false,
            message,
            code,
            timestamp: new Date().toISOString()
        };

        if (details) {
            response.details = details;
        }

        return this.res.status(statusCode).json(response);
    }

    /**
     * Send bad request response (400)
     */
    badRequest(message = 'Bad request', details = null) {
        return this.error(message, StatusCodes.BAD_REQUEST, 'BAD_REQUEST', details);
    }

    /**
     * Send unauthorized response (401)
     */
    unauthorized(message = 'Unauthorized') {
        return this.error(message, StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
    }

    /**
     * Send forbidden response (403)
     */
    forbidden(message = 'Forbidden') {
        return this.error(message, StatusCodes.FORBIDDEN, 'FORBIDDEN');
    }

    /**
     * Send not found response (404)
     */
    notFound(message = 'Resource not found') {
        return this.error(message, StatusCodes.NOT_FOUND, 'NOT_FOUND');
    }

    /**
     * Send conflict response (409)
     */
    conflict(message = 'Resource conflict') {
        return this.error(message, StatusCodes.CONFLICT, 'CONFLICT');
    }

    /**
     * Send validation error response (422)
     */
    validationError(message = 'Validation failed', errors = null) {
        return this.error(message, StatusCodes.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', errors);
    }

    /**
     * Send internal server error response (500)
     */
    internalError(message = 'Internal server error') {
        return this.error(message, StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
    }
}

/**
 * Middleware to attach response builder to res object
 */
const responseBuilderMiddleware = (req, res, next) => {
    res.apiResponse = new ResponseBuilder(res);
    next();
};

module.exports = {
    StatusCodes,
    StatusMessages,
    getStatusMessage,
    isSuccess,
    isClientError,
    isServerError,
    ResponseBuilder,
    responseBuilderMiddleware
};
