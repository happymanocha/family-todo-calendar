/**
 * Authentication Lambda Functions
 * Handles user authentication, token management, and authorization
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { DynamoService } = require('../dynamo/dynamoClient');
const {
    lambdaWrapper,
    parseBody,
    validateRequiredFields,
    successResponse,
    errorResponse,
    getAuthenticatedUser,
    generateId
} = require('../utils/lambda-utils');

const dynamoService = new DynamoService();

// Family members configuration (same as original)
const FAMILY_MEMBERS = {
    'happymanocha@gmail.com': {
        id: 'happy',
        name: 'Happy',
        role: 'admin',
        avatar: 'H'
    },
    'joelminocha@gmail.com': {
        id: 'joel',
        name: 'Joel',
        role: 'member',
        avatar: 'J'
    },
    'upalmonika@gmail.com': {
        id: 'monika',
        name: 'Monika',
        role: 'member',
        avatar: 'M'
    },
    'kiaanminocha@gmail.com': {
        id: 'kiaan',
        name: 'Kiaan',
        role: 'member',
        avatar: 'K'
    }
};

const DEMO_PASSWORD = 'family'; // In production, this should be hashed per user

/**
 * Generate JWT tokens
 */
const generateTokens = (user) => {
    const accessTokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
    };

    const accessToken = jwt.sign(
        accessTokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer'
    };
};

/**
 * Create or update user in DynamoDB
 */
const createOrUpdateUser = async (familyMember, email) => {
    const userId = familyMember.id;

    // Check if user exists
    let user = await dynamoService.getUser(userId);

    if (!user) {
        // Create new user
        user = {
            id: userId,
            email: email,
            name: familyMember.name,
            role: familyMember.role,
            avatar: familyMember.avatar,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            loginAttempts: 0,
            lastLogin: null
        };

        await dynamoService.putUser(user);
    } else {
        // Update existing user
        await dynamoService.updateUser(
            userId,
            'SET #updatedAt = :updatedAt, #lastLogin = :lastLogin',
            {
                ':updatedAt': new Date().toISOString(),
                ':lastLogin': new Date().toISOString()
            },
            {
                '#updatedAt': 'updatedAt',
                '#lastLogin': 'lastLogin'
            }
        );

        user.updatedAt = new Date().toISOString();
        user.lastLogin = new Date().toISOString();
    }

    return user;
};

/**
 * Login handler
 */
const login = lambdaWrapper(async (event) => {
    const body = parseBody(event);
    validateRequiredFields(body, ['email', 'password']);

    const { email, password } = body;

    // Check if email exists in family members
    const familyMember = FAMILY_MEMBERS[email.toLowerCase()];
    if (!familyMember) {
        return errorResponse('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    // Validate password (demo implementation)
    if (password !== DEMO_PASSWORD) {
        return errorResponse('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    try {
        // Create or update user in database
        const user = await createOrUpdateUser(familyMember, email);

        // Generate tokens
        const tokens = generateTokens(user);

        // Create session data (compatible with frontend)
        const sessionData = {
            email: user.email,
            memberName: user.id,
            loginTime: new Date().toISOString(),
            expiresIn: 24 * 60 * 60 * 1000 // 24 hours
        };

        const expirationTime = Date.now() + sessionData.expiresIn;

        return successResponse({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            tokens,
            session: {
                sessionData,
                expirationTime,
                userInfo: {
                    currentFamilyMember: user.id,
                    currentUserEmail: user.email,
                    familyCode: 'FAMILY'
                }
            },
            expiresIn: '24h'
        }, 'Authentication successful');

    } catch (error) {
        console.error('Login error:', error);
        return errorResponse('Authentication failed', 500, 'AUTH_ERROR');
    }
});

/**
 * Logout handler
 */
const logout = lambdaWrapper(async (event) => {
    try {
        // In a real implementation, you might want to:
        // 1. Add token to blacklist
        // 2. Update user's last logout time
        // 3. Invalidate refresh tokens

        const user = getAuthenticatedUser(event);

        // Update user's last logout time
        await dynamoService.updateUser(
            user.userId,
            'SET #lastLogout = :lastLogout',
            {
                ':lastLogout': new Date().toISOString()
            },
            {
                '#lastLogout': 'lastLogout'
            }
        );

        return successResponse(null, 'Logout successful');

    } catch (error) {
        console.error('Logout error:', error);
        return errorResponse('Logout failed', 500, 'LOGOUT_ERROR');
    }
});

/**
 * Refresh token handler
 */
const refreshToken = lambdaWrapper(async (event) => {
    const body = parseBody(event);
    validateRequiredFields(body, ['refreshToken']);

    try {
        const { refreshToken: token } = body;

        // Verify refresh token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await dynamoService.getUser(decoded.userId);
        if (!user) {
            return errorResponse('User not found', 404, 'USER_NOT_FOUND');
        }

        // Generate new tokens
        const tokens = generateTokens(user);

        return successResponse(tokens, 'Token refreshed successfully');

    } catch (error) {
        console.error('Token refresh error:', error);

        if (error.name === 'TokenExpiredError') {
            return errorResponse('Refresh token expired', 401, 'TOKEN_EXPIRED');
        }

        return errorResponse('Invalid refresh token', 401, 'INVALID_TOKEN');
    }
});

/**
 * Get user profile handler
 */
const profile = lambdaWrapper(async (event) => {
    try {
        const user = getAuthenticatedUser(event);

        // Get full user data from database
        const userData = await dynamoService.getUser(user.userId);
        if (!userData) {
            return errorResponse('User not found', 404, 'USER_NOT_FOUND');
        }

        return successResponse({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            avatar: userData.avatar,
            isActive: userData.isActive,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt
        }, 'Profile retrieved successfully');

    } catch (error) {
        console.error('Profile error:', error);
        return errorResponse('Failed to get profile', 500, 'PROFILE_ERROR');
    }
});

/**
 * Validate token handler
 */
const validateToken = lambdaWrapper(async (event) => {
    const body = parseBody(event);
    validateRequiredFields(body, ['token']);

    try {
        const { token } = body;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return successResponse({
            valid: true,
            userId: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            exp: decoded.exp
        }, 'Token is valid');

    } catch (error) {
        return successResponse({
            valid: false,
            error: error.message
        }, 'Token validation result');
    }
});

/**
 * Get family members handler
 */
const familyMembers = lambdaWrapper(async (event) => {
    try {
        const members = Object.entries(FAMILY_MEMBERS).map(([email, member]) => ({
            id: member.id,
            name: member.name,
            email: email,
            role: member.role,
            avatar: member.avatar
        }));

        return successResponse(members, 'Family members retrieved successfully');

    } catch (error) {
        console.error('Family members error:', error);
        return errorResponse('Failed to get family members', 500, 'FAMILY_ERROR');
    }
});

/**
 * Check permission handler
 */
const checkPermission = lambdaWrapper(async (event) => {
    const body = parseBody(event);
    validateRequiredFields(body, ['permission']);

    try {
        const user = getAuthenticatedUser(event);
        const { permission } = body;

        // Basic permission logic
        let hasPermission = false;

        switch (permission) {
            case 'read_todos':
                hasPermission = true; // All family members can read todos
                break;
            case 'create_todos':
                hasPermission = true; // All family members can create todos
                break;
            case 'update_todos':
                hasPermission = true; // All family members can update todos
                break;
            case 'delete_todos':
                hasPermission = user.role === 'admin'; // Only admin can delete
                break;
            case 'manage_users':
                hasPermission = user.role === 'admin'; // Only admin can manage users
                break;
            default:
                hasPermission = false;
        }

        return successResponse({
            hasPermission,
            permission,
            userRole: user.role
        }, 'Permission check completed');

    } catch (error) {
        console.error('Permission check error:', error);
        return errorResponse('Permission check failed', 500, 'PERMISSION_ERROR');
    }
});

module.exports = {
    login,
    logout,
    refreshToken,
    profile,
    validateToken,
    familyMembers,
    checkPermission
};