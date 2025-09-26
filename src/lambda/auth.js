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

// Family members configuration (enhanced with unique IDs and additional fields)
const FAMILY_MEMBERS = {
    'happymanocha@gmail.com': {
        id: 'happy', // Backward compatibility ID
        uniqueId: 'usr-a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Proper UUID
        name: 'Happy',
        role: 'admin',
        avatar: 'H',
        phone: '+1-234-567-8900',
        createdAt: '2024-01-01T00:00:00.000Z'
    },
    'joelminocha@gmail.com': {
        id: 'joel', // Backward compatibility ID
        uniqueId: 'usr-b2c3d4e5-f6g7-8901-bcde-f23456789012', // Proper UUID
        name: 'Joel',
        role: 'member',
        avatar: 'J',
        phone: '+1-234-567-8901',
        createdAt: '2024-01-01T00:00:00.000Z'
    },
    'upalmonika@gmail.com': {
        id: 'monika', // Backward compatibility ID
        uniqueId: 'usr-c3d4e5f6-g7h8-9012-cdef-345678901234', // Proper UUID
        name: 'Monika',
        role: 'member',
        avatar: 'M',
        phone: '+1-234-567-8902',
        createdAt: '2024-01-01T00:00:00.000Z'
    },
    'kiaanminocha@gmail.com': {
        id: 'kiaan', // Backward compatibility ID
        uniqueId: 'usr-d4e5f6g7-h8i9-0123-defg-456789012345', // Proper UUID
        name: 'Kiaan',
        role: 'member',
        avatar: 'K',
        phone: '+1-234-567-8903',
        createdAt: '2024-01-01T00:00:00.000Z'
    }
};

const DEMO_PASSWORD = 'family'; // In production, this should be hashed per user

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
            uniqueId: familyMember.uniqueId,
            email: email,
            name: familyMember.name,
            role: familyMember.role,
            avatar: familyMember.avatar,
            phone: familyMember.phone,
            isActive: true,
            createdAt: familyMember.createdAt,
            updatedAt: new Date().toISOString(),
            loginAttempts: 0,
            lastLogin: null
        };

        await dynamoService.putUser(user);
    } else {
        // Update existing user with new fields if they don't exist
        await dynamoService.updateUser(
            userId,
            'SET #updatedAt = :updatedAt, #lastLogin = :lastLogin, #uniqueId = if_not_exists(#uniqueId, :uniqueId), #phone = if_not_exists(#phone, :phone)',
            {
                ':updatedAt': new Date().toISOString(),
                ':lastLogin': new Date().toISOString(),
                ':uniqueId': familyMember.uniqueId,
                ':phone': familyMember.phone
            },
            {
                '#updatedAt': 'updatedAt',
                '#lastLogin': 'lastLogin',
                '#uniqueId': 'uniqueId',
                '#phone': 'phone'
            }
        );

        user.updatedAt = new Date().toISOString();
        user.lastLogin = new Date().toISOString();
        user.uniqueId = user.uniqueId || familyMember.uniqueId;
        user.phone = user.phone || familyMember.phone;
    }

    return user;
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

        console.log('Saving user to database...');
        await dynamoService.putUser(userData);
        console.log('User saved successfully');

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
        const user = await dynamoService.getUserByEmail(email.toLowerCase());
        if (!user) {
            return errorResponse('Invalid email or password', 401, 'UNAUTHORIZED');
        }

        console.log('User found:', user.email);

        // Validate password
        const bcrypt = require('bcryptjs');
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
    const body = parseBody(event);
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
        const members = Object.entries(FAMILY_MEMBERS).map(([email, member]) => ({
            id: member.id,
            uniqueId: member.uniqueId,
            name: member.name,
            email: email,
            role: member.role,
            avatar: member.avatar,
            phone: member.phone,
            createdAt: member.createdAt
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
    register,
    login,
    logout,
    refreshToken,
    profile,
    validateToken,
    familyMembers,
    checkPermission
};