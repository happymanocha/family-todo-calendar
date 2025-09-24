/**
 * Request Logging Middleware
 * Logs HTTP requests and responses
 */

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request
    console.log(`📨 ${req.method} ${req.url} - ${req.ip} - ${new Date().toISOString()}`);

    // Capture response details
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - start;
        const size = Buffer.byteLength(data || '');

        console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${size} bytes`);

        originalSend.call(this, data);
    };

    next();
};

/**
 * API request logger with more details
 */
const apiLogger = (req, res, next) => {
    const start = Date.now();

    const logData = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString(),
        userId: req.user?.userId || 'anonymous',
        headers: {
            authorization: req.get('Authorization') ? 'Bearer ***' : 'none',
            contentType: req.get('Content-Type'),
            accept: req.get('Accept')
        }
    };

    // Log request body for POST/PUT/PATCH (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        const sanitizedBody = { ...req.body };
        // Remove sensitive fields
        delete sanitizedBody.password;
        delete sanitizedBody.token;
        delete sanitizedBody.refreshToken;
        logData.body = sanitizedBody;
    }

    console.log('🔍 API Request:', JSON.stringify(logData, null, 2));

    // Capture response
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - start;

        console.log('✅ API Response:', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            success: data?.success,
            timestamp: new Date().toISOString()
        });

        originalJson.call(this, data);
    };

    next();
};

/**
 * Security logger for authentication events
 */
const securityLogger = (event, req, details = {}) => {
    const logData = {
        event,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        userId: req.user?.userId || details.userId || 'anonymous',
        ...details
    };

    console.log('🔒 Security Event:', JSON.stringify(logData, null, 2));
};

/**
 * Performance logger
 */
const performanceLogger = (label) => {
    return (req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            if (duration > 1000) { // Log slow requests (>1s)
                console.log(`⚠️  Slow ${label}:`, {
                    method: req.method,
                    url: req.url,
                    duration: `${duration}ms`,
                    statusCode: res.statusCode,
                    timestamp: new Date().toISOString()
                });
            }
        });

        next();
    };
};

module.exports = {
    requestLogger,
    apiLogger,
    securityLogger,
    performanceLogger
};