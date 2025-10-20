/**
 * Request ID Middleware
 * Generates and tracks unique request IDs for tracing and debugging
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique request ID
 * @param {Object} req Express request object
 * @returns {string} Unique request ID
 */
const generateRequestId = (req) => {
    // Use existing request ID from header if available (for distributed tracing)
    const existingId = req.headers['x-request-id'] ||
                       req.headers['x-correlation-id'] ||
                       req.headers['x-trace-id'];

    if (existingId) {
        return existingId;
    }

    // Generate new UUID
    return uuidv4();
};

/**
 * Request ID middleware
 * Attaches unique ID to each request for tracking
 *
 * @param {Object} options Configuration options
 * @param {string} options.headerName Header name for request ID (default: 'X-Request-ID')
 * @param {Function} options.generator Custom ID generator function
 * @param {boolean} options.setResponseHeader Include ID in response header (default: true)
 */
const requestIdMiddleware = (options = {}) => {
    const {
        headerName = 'X-Request-ID',
        generator = generateRequestId,
        setResponseHeader = true
    } = options;

    return (req, res, next) => {
        // Generate or extract request ID
        const requestId = generator(req);

        // Attach to request object
        req.id = requestId;
        req.requestId = requestId;

        // Set response header
        if (setResponseHeader) {
            res.setHeader(headerName, requestId);
        }

        // Add request start time for duration tracking
        req.startTime = Date.now();

        // Intercept res.json to add requestId to all JSON responses
        const originalJson = res.json.bind(res);
        res.json = function(body) {
            if (body && typeof body === 'object' && !body.requestId) {
                body.requestId = requestId;
            }
            return originalJson(body);
        };

        // Log request with ID
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[${requestId}] ${req.method} ${req.originalUrl || req.url}`);
        }

        // Track request completion
        res.on('finish', () => {
            const duration = Date.now() - req.startTime;
            if (process.env.NODE_ENV !== 'test') {
                console.log(`[${requestId}] ${res.statusCode} - ${duration}ms`);
            }
        });

        next();
    };
};

/**
 * Get request ID from request object
 * @param {Object} req Express request object
 * @returns {string|null} Request ID or null
 */
const getRequestId = (req) => {
    return req.id || req.requestId || null;
};

/**
 * Request logging middleware with request ID
 * Enhanced logging with request/response details
 */
const requestLogger = (options = {}) => {
    const {
        logHeaders = false,
        logBody = false,
        logQuery = true
    } = options;

    return (req, res, next) => {
        const requestId = getRequestId(req);
        const logData = {
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent')
        };

        if (logQuery && Object.keys(req.query).length > 0) {
            logData.query = req.query;
        }

        if (logHeaders) {
            logData.headers = req.headers;
        }

        if (logBody && req.body && Object.keys(req.body).length > 0) {
            // Don't log sensitive fields
            const sanitizedBody = { ...req.body };
            delete sanitizedBody.password;
            delete sanitizedBody.confirmPassword;
            delete sanitizedBody.token;
            delete sanitizedBody.refreshToken;
            logData.body = sanitizedBody;
        }

        console.log('Request:', JSON.stringify(logData, null, 2));

        // Log response
        res.on('finish', () => {
            console.log('Response:', JSON.stringify({
                requestId,
                statusCode: res.statusCode,
                duration: `${Date.now() - req.startTime}ms`
            }, null, 2));
        });

        next();
    };
};

module.exports = {
    requestIdMiddleware,
    generateRequestId,
    getRequestId,
    requestLogger
};
