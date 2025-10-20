/**
 * Input Sanitization Middleware
 * Sanitizes user input to prevent XSS and injection attacks
 */

/**
 * Simple HTML entity encoding for XSS prevention
 * @param {string} str String to sanitize
 * @returns {string} Sanitized string
 */
const escapeHTML = (str) => {
    if (typeof str !== 'string') return str;

    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char]);
};

/**
 * Remove potentially dangerous script tags and content
 * @param {string} str String to clean
 * @returns {string} Cleaned string
 */
const removeScripts = (str) => {
    if (typeof str !== 'string') return str;

    // Remove script tags and their content
    let cleaned = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove on* event handlers (onclick, onerror, etc.)
    cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    cleaned = cleaned.replace(/javascript:/gi, '');

    return cleaned;
};

/**
 * Sanitize a single value
 * @param {*} value Value to sanitize
 * @param {Object} options Sanitization options
 * @returns {*} Sanitized value
 */
const sanitizeValue = (value, options = {}) => {
    const {
        allowHTML = false,
        removeScriptTags = true,
        trim = true
    } = options;

    // Skip non-string values
    if (typeof value !== 'string') {
        return value;
    }

    let sanitized = value;

    // Trim whitespace
    if (trim) {
        sanitized = sanitized.trim();
    }

    // Remove script tags and dangerous content
    if (removeScriptTags) {
        sanitized = removeScripts(sanitized);
    }

    // Escape HTML entities unless HTML is allowed
    if (!allowHTML) {
        sanitized = escapeHTML(sanitized);
    }

    return sanitized;
};

/**
 * Recursively sanitize an object
 * @param {*} obj Object to sanitize
 * @param {Object} options Sanitization options
 * @returns {*} Sanitized object
 */
const sanitizeObject = (obj, options = {}) => {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return sanitizeValue(obj, options);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, options));
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value, options);
        }
        return sanitized;
    }

    return obj;
};

/**
 * Middleware to sanitize request body
 * @param {Object} options Sanitization options
 */
const sanitizeBody = (options = {}) => {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body, options);
        }
        next();
    };
};

/**
 * Middleware to sanitize query parameters
 * @param {Object} options Sanitization options
 */
const sanitizeQuery = (options = {}) => {
    return (req, res, next) => {
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query, options);
        }
        next();
    };
};

/**
 * Middleware to sanitize request parameters
 * @param {Object} options Sanitization options
 */
const sanitizeParams = (options = {}) => {
    return (req, res, next) => {
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params, options);
        }
        next();
    };
};

/**
 * Sanitize all request inputs (body, query, params)
 * @param {Object} options Sanitization options
 */
const sanitizeAll = (options = {}) => {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body, options);
        }
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query, options);
        }
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params, options);
        }
        next();
    };
};

module.exports = {
    escapeHTML,
    removeScripts,
    sanitizeValue,
    sanitizeObject,
    sanitizeBody,
    sanitizeQuery,
    sanitizeParams,
    sanitizeAll
};
