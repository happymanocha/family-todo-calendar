/**
 * Rate Limiting Middleware
 * Protects API endpoints from brute force and DoS attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Applies to all API routes
 */
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip successful requests that don't consume resources
    skipSuccessfulRequests: false,
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests from this IP, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force login attempts
 */
const authLimiter = rateLimit({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5, // Limit each IP to 5 login requests per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful auth attempts
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});

/**
 * Very strict rate limiter for sensitive operations
 * Applied to operations like password reset, account changes
 */
const strictLimiter = rateLimit({
    windowMs: parseInt(process.env.STRICT_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.STRICT_RATE_LIMIT_MAX_REQUESTS) || 3, // Limit each IP to 3 requests per windowMs
    message: {
        success: false,
        message: 'Too many sensitive requests from this IP, please try again after an hour',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many sensitive requests from this IP, please try again after an hour',
            code: 'STRICT_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});

/**
 * Family code lookup rate limiter
 * Prevents brute force family code guessing
 */
const familyCodeLimiter = rateLimit({
    windowMs: parseInt(process.env.FAMILY_CODE_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.FAMILY_CODE_RATE_LIMIT_MAX_REQUESTS) || 10, // Limit each IP to 10 lookups per hour
    message: {
        success: false,
        message: 'Too many family code lookup attempts, please try again later',
        code: 'FAMILY_CODE_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many family code lookup attempts, please try again later',
            code: 'FAMILY_CODE_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});

/**
 * Create account rate limiter
 * Prevents automated account creation spam
 */
const createAccountLimiter = rateLimit({
    windowMs: parseInt(process.env.CREATE_ACCOUNT_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.CREATE_ACCOUNT_RATE_LIMIT_MAX_REQUESTS) || 3, // Limit each IP to 3 account creations per hour
    message: {
        success: false,
        message: 'Too many accounts created from this IP, please try again later',
        code: 'CREATE_ACCOUNT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many accounts created from this IP, please try again later',
            code: 'CREATE_ACCOUNT_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    strictLimiter,
    familyCodeLimiter,
    createAccountLimiter
};
