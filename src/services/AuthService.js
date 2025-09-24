/**
 * Authentication Service
 * Handles authentication logic and JWT operations
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authConfig = require('../config/auth');

class AuthService {
    /**
     * Authenticate user with email and password
     * @param {string} email User email
     * @param {string} password User password
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(email, password) {
        try {
            // Find user by email
            const user = User.findByEmail(email);
            if (!user) {
                return {
                    success: false,
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                };
            }

            // Check if user is locked
            if (user.isLocked()) {
                return {
                    success: false,
                    message: 'Account is temporarily locked due to too many failed login attempts',
                    code: 'ACCOUNT_LOCKED'
                };
            }

            // For demo purposes, we're using plain text password comparison
            // In production, this would use bcrypt
            const isPasswordValid = password === 'family';

            if (!isPasswordValid) {
                user.incrementLoginAttempts();
                return {
                    success: false,
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                };
            }

            // Reset login attempts on successful login
            user.resetLoginAttempts();

            // Generate tokens
            const tokens = this.generateTokens(user);

            return {
                success: true,
                message: 'Authentication successful',
                user: user.toJSON(),
                tokens,
                expiresIn: authConfig.jwt.expiresIn
            };

        } catch (error) {
            console.error('Authentication error:', error);
            return {
                success: false,
                message: 'Authentication failed',
                code: 'AUTH_ERROR'
            };
        }
    }

    /**
     * Generate JWT tokens for user
     * @param {User} user User instance
     * @returns {Object} Generated tokens
     */
    generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        const accessToken = jwt.sign(
            payload,
            authConfig.jwt.secret,
            { expiresIn: authConfig.jwt.expiresIn }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            authConfig.jwt.secret,
            { expiresIn: authConfig.jwt.refreshExpiresIn }
        );

        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer'
        };
    }

    /**
     * Verify JWT token
     * @param {string} token JWT token
     * @returns {Object} Verification result
     */
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, authConfig.jwt.secret);
            return {
                success: true,
                payload: decoded
            };
        } catch (error) {
            return {
                success: false,
                message: 'Invalid or expired token',
                error: error.message
            };
        }
    }

    /**
     * Refresh access token
     * @param {string} refreshToken Refresh token
     * @returns {Promise<Object>} Refresh result
     */
    async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, authConfig.jwt.secret);
            const user = User.findById(decoded.userId);

            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            const tokens = this.generateTokens(user);

            return {
                success: true,
                user: user.toJSON(),
                tokens
            };

        } catch (error) {
            return {
                success: false,
                message: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            };
        }
    }

    /**
     * Logout user (invalidate tokens)
     * @param {string} token JWT token
     * @returns {Object} Logout result
     */
    logout(token) {
        // In a real application, you would add the token to a blacklist
        // For now, we'll just return success
        return {
            success: true,
            message: 'Logout successful'
        };
    }

    /**
     * Get current user from token
     * @param {string} token JWT token
     * @returns {Object} User data
     */
    getCurrentUser(token) {
        const verification = this.verifyToken(token);
        if (!verification.success) {
            return null;
        }

        const user = User.findById(verification.payload.userId);
        return user ? user.toJSON() : null;
    }

    /**
     * Check if user has permission
     * @param {Object} user User object
     * @param {string} permission Required permission
     * @returns {boolean} Permission status
     */
    hasPermission(user, permission) {
        // Simple role-based permission system
        const permissions = {
            admin: ['create', 'read', 'update', 'delete', 'manage_users'],
            member: ['create', 'read', 'update', 'delete']
        };

        const userPermissions = permissions[user.role] || [];
        return userPermissions.includes(permission);
    }

    /**
     * Generate session for client-side storage
     * @param {User} user User instance
     * @param {boolean} rememberMe Remember me option
     * @returns {Object} Session data
     */
    generateSession(user, rememberMe = false) {
        const expiresIn = rememberMe
            ? authConfig.session.rememberMeExpiry
            : authConfig.session.defaultExpiry;

        return {
            sessionData: {
                email: user.email,
                memberName: user.id,
                loginTime: new Date().toISOString(),
                expiresIn
            },
            expirationTime: Date.now() + expiresIn,
            userInfo: {
                currentFamilyMember: user.id,
                currentUserEmail: user.email,
                familyCode: 'FAMILY'
            }
        };
    }
}

module.exports = new AuthService();