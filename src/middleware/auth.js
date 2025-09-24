/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

const AuthService = require('../services/AuthService');

/**
 * Verify JWT token middleware
 */
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required',
                code: 'TOKEN_MISSING'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const verification = AuthService.verifyToken(token);

        if (!verification.success) {
            return res.status(401).json({
                success: false,
                message: verification.message,
                code: 'TOKEN_INVALID'
            });
        }

        // Add user info to request
        req.user = verification.payload;
        req.token = token;

        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Token verification failed',
            code: 'TOKEN_VERIFICATION_ERROR'
        });
    }
};

/**
 * Optional authentication middleware
 * Verifies token if present, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const verification = AuthService.verifyToken(token);

            if (verification.success) {
                req.user = verification.payload;
                req.token = token;
            }
        }

        next();
    } catch (error) {
        // Log error but continue without authentication
        console.error('Optional auth error:', error);
        next();
    }
};

/**
 * Role-based authorization middleware
 * @param {Array|string} allowedRoles Allowed roles
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        next();
    };
};

/**
 * Permission-based authorization middleware
 * @param {string} permission Required permission
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!AuthService.hasPermission(req.user, permission)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        next();
    };
};

/**
 * Resource ownership middleware
 * Checks if user owns the resource or has admin role
 */
const requireOwnership = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
        return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params.userId || req.body.userId || req.body.assignedTo;

    if (resourceUserId && resourceUserId !== req.user.userId) {
        return res.status(403).json({
            success: false,
            message: 'Access denied to this resource',
            code: 'ACCESS_DENIED'
        });
    }

    next();
};

module.exports = {
    verifyToken,
    optionalAuth,
    requireRole,
    requirePermission,
    requireOwnership
};