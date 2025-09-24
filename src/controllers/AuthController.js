/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

const AuthService = require('../services/AuthService');
const User = require('../models/User');

class AuthController {
    /**
     * @desc    Login user
     * @route   POST /api/auth/login
     * @access  Public
     */
    async login(req, res) {
        try {
            const { email, password, rememberMe } = req.body;

            const result = await AuthService.authenticate(email, password);

            if (!result.success) {
                return res.status(401).json(result);
            }

            // Generate session data for client-side storage
            const sessionData = AuthService.generateSession(
                User.findByEmail(email),
                rememberMe
            );

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    user: result.user,
                    tokens: result.tokens,
                    session: sessionData,
                    expiresIn: result.expiresIn
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed',
                code: 'LOGIN_ERROR'
            });
        }
    }

    /**
     * @desc    Refresh access token
     * @route   POST /api/auth/refresh
     * @access  Public
     */
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            const result = await AuthService.refreshToken(refreshToken);

            if (!result.success) {
                return res.status(401).json(result);
            }

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    user: result.user,
                    tokens: result.tokens
                }
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                message: 'Token refresh failed',
                code: 'TOKEN_REFRESH_ERROR'
            });
        }
    }

    /**
     * @desc    Logout user
     * @route   POST /api/auth/logout
     * @access  Private
     */
    async logout(req, res) {
        try {
            const result = AuthService.logout(req.token);

            res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed',
                code: 'LOGOUT_ERROR'
            });
        }
    }

    /**
     * @desc    Get current user profile
     * @route   GET /api/auth/profile
     * @access  Private
     */
    async getProfile(req, res) {
        try {
            const user = User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Profile retrieved successfully',
                data: user.toJSON()
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve profile',
                code: 'PROFILE_ERROR'
            });
        }
    }

    /**
     * @desc    Validate token
     * @route   POST /api/auth/validate
     * @access  Public
     */
    async validateToken(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token is required',
                    code: 'TOKEN_REQUIRED'
                });
            }

            const result = AuthService.verifyToken(token);

            if (!result.success) {
                return res.status(401).json(result);
            }

            const user = User.findById(result.payload.userId);

            res.status(200).json({
                success: true,
                message: 'Token is valid',
                data: {
                    user: user ? user.toJSON() : null,
                    payload: result.payload
                }
            });

        } catch (error) {
            console.error('Token validation error:', error);
            res.status(500).json({
                success: false,
                message: 'Token validation failed',
                code: 'TOKEN_VALIDATION_ERROR'
            });
        }
    }

    /**
     * @desc    Get all family members
     * @route   GET /api/auth/family-members
     * @access  Private
     */
    async getFamilyMembers(req, res) {
        try {
            const familyMembers = User.getFamilyMembers();

            res.status(200).json({
                success: true,
                message: 'Family members retrieved successfully',
                data: familyMembers.map(user => user.toJSON())
            });

        } catch (error) {
            console.error('Get family members error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve family members',
                code: 'FAMILY_MEMBERS_ERROR'
            });
        }
    }

    /**
     * @desc    Check user permissions
     * @route   POST /api/auth/check-permission
     * @access  Private
     */
    async checkPermission(req, res) {
        try {
            const { permission } = req.body;

            if (!permission) {
                return res.status(400).json({
                    success: false,
                    message: 'Permission is required',
                    code: 'PERMISSION_REQUIRED'
                });
            }

            const hasPermission = AuthService.hasPermission(req.user, permission);

            res.status(200).json({
                success: true,
                message: 'Permission check completed',
                data: {
                    hasPermission,
                    permission,
                    user: req.user
                }
            });

        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                message: 'Permission check failed',
                code: 'PERMISSION_CHECK_ERROR'
            });
        }
    }
}

module.exports = new AuthController();