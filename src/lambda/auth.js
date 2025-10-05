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

/**
 * Generate JWT tokens
 */
const generateTokens = (user) => {
    const accessTokenPayload = {
        userId: user.id,
        uniqueId: user.uniqueId,
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
        {
            userId: user.id,
            uniqueId: user.uniqueId
        },
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
 * Register new user
 * POST /api/auth/register
 */
const register = lambdaWrapper(async (event) => {
    const body = parseBody(event.body);

    // Validate required fields
    const requiredFields = ['name', 'email', 'password'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
        return errorResponse(`Missing required fields: ${validation.missingFields.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const { name, email, password, familyId, familyCode, isCreatingFamily } = body;

    try {
        console.log('Starting registration process for:', email);

        // Check if user already exists
        console.log('Checking if user exists...');
        const existingUser = await dynamoService.getUserByEmail(email.toLowerCase());
        if (existingUser) {
            console.log('User already exists:', email);
            return errorResponse('User with this email already exists', 409, 'USER_EXISTS');
        }

        let targetFamilyId = familyId;
        let userRole = 'member';

        console.log('Processing family association - isCreatingFamily:', isCreatingFamily);

        console.log('Creating user first...');
        // Create user first
        const User = require('../models/User');
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            role: isCreatingFamily ? 'admin' : 'member',
            familyId: null, // Will be set after family creation
            avatar: name.trim().charAt(0).toUpperCase(),
            isActive: true
        });

        // Validate user data
        const userValidation = newUser.validate();
        if (!userValidation.isValid) {
            return errorResponse('Invalid user data', 400, 'VALIDATION_ERROR', userValidation.errors);
        }

        // Hash password
        const hashedPassword = await newUser.hashPassword(password);

        // Handle family association
        if (isCreatingFamily) {
            // User is creating a new family
            if (!body.familyName) {
                return errorResponse('Family name is required when creating family', 400, 'VALIDATION_ERROR');
            }

            // Create the family with the user as admin
            console.log('Creating new family with name:', body.familyName);
            const Family = require('../models/Family');
            const newFamily = Family.fromFormData(body, newUser.id); // Use the user's ID as admin
            console.log('Family object created:', newFamily);

            // Save family
            console.log('Saving family to DynamoDB...');
            await dynamoService.createFamily(newFamily.toJSON());
            targetFamilyId = newFamily.familyId;
            userRole = 'admin';
            console.log('Family saved successfully with ID:', targetFamilyId);

            // Update user with family ID
            newUser.familyId = targetFamilyId;

        } else if (familyCode) {
            // User is joining existing family
            const family = await dynamoService.getFamilyByCode(familyCode.toUpperCase());
            if (!family) {
                return errorResponse('Invalid family code', 404, 'INVALID_CODE');
            }

            const Family = require('../models/Family');
            const familyObj = new Family(family);
            if (!familyObj.canAcceptNewMembers()) {
                return errorResponse('Family is not accepting new members', 403, 'FAMILY_CLOSED');
            }

            targetFamilyId = family.familyId;
            newUser.familyId = targetFamilyId;

        } else {
            return errorResponse('Must specify family code to join or create new family', 400, 'VALIDATION_ERROR');
        }

        console.log('Finalizing user creation...');

        // Save user to database
        const userData = {
            ...newUser.toJSON(),
            password: hashedPassword
        };

        console.log('Saving user to database with familyId:', userData.familyId);
        console.log('User data being saved:', JSON.stringify(userData, null, 2));
        await dynamoService.putUser(userData);
        console.log('User saved successfully with familyId:', userData.familyId);

        // Update family member count
        if (isCreatingFamily) {
            console.log('Family already created with admin set');
        } else {
            // Increment member count for existing family
            const family = await dynamoService.getFamily(targetFamilyId);
            if (family) {
                await dynamoService.updateFamily(
                    targetFamilyId,
                    'SET memberCount = :memberCount, updatedAt = :updatedAt',
                    {
                        ':memberCount': (family.memberCount || 0) + 1,
                        ':updatedAt': new Date().toISOString()
                    }
                );
            }
        }

        // Generate tokens
        const tokens = generateTokens({
            id: newUser.id,
            uniqueId: newUser.uniqueId,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            familyId: targetFamilyId
        });

        // Return success response
        return successResponse({
            user: newUser.toJSON(),
            ...tokens
        }, 'Registration successful');

    } catch (error) {
        console.error('Registration error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            payload: body
        });
        return errorResponse(`Registration failed: ${error.message}`, 500, 'REGISTRATION_ERROR');
    }
});

/**
 * Login handler
 */
const login = lambdaWrapper(async (event) => {
    const body = parseBody(event.body);

    // Validate required fields
    const validation = validateRequiredFields(body, ['email', 'password']);
    if (!validation.isValid) {
        return errorResponse(`Missing required fields: ${validation.missingFields.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const { email, password } = body;

    console.log('Login attempt for:', email);

    try {
        // Get user from database
        let user = await dynamoService.getUserByEmail(email.toLowerCase());

        if (!user) {
            return errorResponse('Invalid email or password', 401, 'UNAUTHORIZED');
        }

        console.log('User found:', user.email);

        // Validate password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('Invalid password for user:', email);
            return errorResponse('Invalid email or password', 401, 'UNAUTHORIZED');
        }

        console.log('Password validated for user:', email);

        // Generate tokens
        const tokens = generateTokens({
            id: user.id,
            uniqueId: user.uniqueId,
            email: user.email,
            name: user.name,
            role: user.role,
            familyId: user.familyId
        });

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
                uniqueId: user.uniqueId,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                phone: user.phone,
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
    const body = parseBody(event.body);
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
            uniqueId: userData.uniqueId,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            avatar: userData.avatar,
            phone: userData.phone,
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
    const body = parseBody(event.body);
    validateRequiredFields(body, ['token']);

    try {
        const { token } = body;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return successResponse({
            valid: true,
            userId: decoded.userId,
            uniqueId: decoded.uniqueId,
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
        console.log('Family members endpoint called');

        // Get authenticated user
        let user;
        try {
            const tokenData = getAuthenticatedUser(event);
            console.log('Token data:', tokenData?.email, 'tokenFamilyId:', tokenData?.familyId);

            // Fetch fresh user data from database to get current familyId
            user = await dynamoService.getUserByEmail(tokenData.email);
            console.log('Fresh user data from DB:', user?.email, 'familyId:', user?.familyId);
            console.log('Full fresh user data:', JSON.stringify(user, null, 2));
        } catch (authError) {
            console.error('Authentication failed:', authError.message);
            return errorResponse('Authentication required', 401, 'UNAUTHORIZED');
        }

        if (!user || !user.familyId) {
            return errorResponse('User is not associated with any family', 400, 'NO_FAMILY');
        }

        // Get all users in the same family from database
        const familyUsers = await dynamoService.getUsersByFamily(user.familyId);
        console.log('Found family users:', familyUsers?.length || 0);

        if (!familyUsers || familyUsers.length === 0) {
            return successResponse([], 'No family members found');
        }

        // Format members for frontend
        const members = familyUsers.map(member => ({
            id: member.id,
            uniqueId: member.uniqueId,
            name: member.name,
            email: member.email,
            role: member.role,
            avatar: member.avatar,
            phone: member.phone || '',
            isActive: member.isActive,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt
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
    const body = parseBody(event.body);
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
    register,
    login,
    logout,
    refreshToken,
    profile,
    validateToken,
    familyMembers,
    checkPermission
};