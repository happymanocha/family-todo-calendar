/**
 * Family Management Lambda Functions
 * Handles family creation, joining, and management operations
 */

const { v4: uuidv4 } = require('uuid');
const { DynamoService } = require('../dynamo/dynamoClient');
const Family = require('../models/Family');
const User = require('../models/User');
const {
    lambdaWrapper,
    parseBody,
    validateRequiredFields,
    successResponse,
    errorResponse,
    getAuthenticatedUser
} = require('../utils/lambda-utils');

const dynamoService = new DynamoService();

/**
 * Create a new family
 * POST /api/families
 */
const createFamily = lambdaWrapper(async (event) => {
    const body = parseBody(event.body);

    // Validate required fields
    const requiredFields = ['familyName'];
    const validation = validateRequiredFields(body, requiredFields);
    if (!validation.isValid) {
        return errorResponse(400, 'Missing required fields', validation.missingFields);
    }

    // Get authenticated user (if creating while logged in)
    let adminUserId = null;
    try {
        const authUser = getAuthenticatedUser(event);
        adminUserId = authUser.userId;
    } catch (error) {
        // Allow creating family without being logged in (will create admin during registration)
        adminUserId = uuidv4(); // Temporary ID that will be replaced during registration
    }

    // Create family instance
    const family = Family.fromFormData(body, adminUserId);

    // Validate family data
    const familyValidation = family.validate();
    if (!familyValidation.isValid) {
        return errorResponse(400, 'Invalid family data', familyValidation.errors);
    }

    try {
        // Check if family code already exists (very unlikely but possible)
        let attempts = 0;
        while (attempts < 3) {
            const existingFamily = await dynamoService.getFamilyByCode(family.familyCode);
            if (!existingFamily) {
                break;
            }
            family.regenerateCode();
            attempts++;
        }

        if (attempts >= 3) {
            return errorResponse(500, 'Unable to generate unique family code');
        }

        // Save family to database
        await dynamoService.createFamily(family.toJSON());

        // Generate invite data
        const inviteData = family.generateInviteData();

        return successResponse({
            family: family.toJSON(),
            inviteData: inviteData
        }, 'Family created successfully');

    } catch (error) {
        console.error('Error creating family:', error);
        return errorResponse(500, 'Failed to create family');
    }
});

/**
 * Get current user's family information
 * GET /api/families/current
 */
const getCurrentFamily = lambdaWrapper(async (event) => {
    try {
        // Get authenticated user
        const authUser = getAuthenticatedUser(event);

        // Get user data to find their family
        const user = await dynamoService.getUserByEmail(authUser.email);
        if (!user) {
            return errorResponse(404, 'User not found');
        }

        if (!user.familyId) {
            return errorResponse(404, 'User is not associated with any family');
        }

        // Get family data
        const familyData = await dynamoService.getFamily(user.familyId);
        if (!familyData) {
            return errorResponse(404, 'Family not found');
        }

        const family = new Family(familyData);

        // Check if user is admin
        const isAdmin = family.adminUserId === user.id;

        // Return family info with admin status
        const responseData = {
            ...family.toJSON(),
            isCurrentUserAdmin: isAdmin,
            currentUserId: user.id
        };

        return successResponse(responseData);

    } catch (error) {
        if (error.message.includes('Authorization header') ||
            error.message.includes('Token') ||
            error.message.includes('Invalid token')) {
            return errorResponse(401, 'Authentication required');
        }
        console.error('Error getting current family:', error);
        return errorResponse(500, 'Failed to get family information');
    }
});

/**
 * Get family by ID
 * GET /api/families/{familyId}
 */
const getFamily = lambdaWrapper(async (event) => {
    const { familyId } = event.pathParameters;

    if (!familyId) {
        return errorResponse(400, 'Family ID is required');
    }

    try {
        // Get authenticated user
        const authUser = getAuthenticatedUser(event);

        // Get family
        const familyData = await dynamoService.getFamily(familyId);
        if (!familyData) {
            return errorResponse(404, 'Family not found');
        }

        const family = new Family(familyData);

        // Check if user belongs to this family or is admin
        const user = await dynamoService.getUser(authUser.userId);
        const isAdmin = family.adminUserId === authUser.userId;
        const isMember = user && user.familyId === familyId;

        if (!isAdmin && !isMember) {
            return errorResponse(403, 'Access denied');
        }

        // Return full data for admins, limited for members
        const responseData = isAdmin ? family.toJSON() : family.toPublicJSON();

        return successResponse(responseData);

    } catch (error) {
        if (error.message === 'Unauthorized') {
            return errorResponse(401, 'Authentication required');
        }
        console.error('Error getting family:', error);
        return errorResponse(500, 'Failed to get family');
    }
});

/**
 * Get family by code (for joining)
 * GET /api/families/code/{familyCode}
 */
const getFamilyByCode = lambdaWrapper(async (event) => {
    const { familyCode } = event.pathParameters;

    if (!familyCode) {
        return errorResponse(400, 'Family code is required');
    }

    try {
        // Get family by code
        const familyData = await dynamoService.getFamilyByCode(familyCode.toUpperCase());
        if (!familyData) {
            return errorResponse(404, 'Family not found with this code');
        }

        const family = new Family(familyData);

        // Check if family can accept new members
        if (!family.canAcceptNewMembers()) {
            return errorResponse(403, 'Family is not accepting new members');
        }

        // Get current family members for preview
        const members = await dynamoService.getUsersByFamily(family.familyId);
        const memberPreviews = members.map(member => ({
            name: member.name,
            avatar: member.avatar,
            role: member.role,
            joinedAt: member.createdAt
        }));

        // Return public family info with member previews
        return successResponse({
            family: family.toPublicJSON(),
            members: memberPreviews,
            canJoin: true
        });

    } catch (error) {
        console.error('Error getting family by code:', error);
        return errorResponse(500, 'Failed to get family');
    }
});

/**
 * Update family
 * PUT /api/families/{familyId}
 */
const updateFamily = lambdaWrapper(async (event) => {
    const { familyId } = event.pathParameters;
    const body = parseBody(event.body);

    if (!familyId) {
        return errorResponse(400, 'Family ID is required');
    }

    try {
        // Get authenticated user
        const authUser = getAuthenticatedUser(event);

        // Get family
        const familyData = await dynamoService.getFamily(familyId);
        if (!familyData) {
            return errorResponse(404, 'Family not found');
        }

        const family = new Family(familyData);

        // Check if user is admin
        if (family.adminUserId !== authUser.userId) {
            return errorResponse(403, 'Only family admin can update family settings');
        }

        // Update family data
        const updateFields = {};
        if (body.familyName) updateFields.familyName = body.familyName.trim();
        if (body.description !== undefined) updateFields.description = body.description.trim();
        if (body.settings) updateFields.settings = { ...family.settings, ...body.settings };

        updateFields.updatedAt = new Date().toISOString();

        // Build update expression
        const updateExpression = Object.keys(updateFields).map(key => `#${key} = :${key}`).join(', ');
        const expressionAttributeNames = Object.keys(updateFields).reduce((acc, key) => {
            acc[`#${key}`] = key;
            return acc;
        }, {});
        const expressionAttributeValues = Object.keys(updateFields).reduce((acc, key) => {
            acc[`:${key}`] = updateFields[key];
            return acc;
        }, {});

        // Update family
        const updatedFamily = await dynamoService.updateFamily(
            familyId,
            `SET ${updateExpression}`,
            expressionAttributeValues,
            expressionAttributeNames
        );

        return successResponse(updatedFamily, 'Family updated successfully');

    } catch (error) {
        if (error.message === 'Unauthorized') {
            return errorResponse(401, 'Authentication required');
        }
        console.error('Error updating family:', error);
        return errorResponse(500, 'Failed to update family');
    }
});

/**
 * Get family members
 * GET /api/families/{familyId}/members
 */
const getFamilyMembers = lambdaWrapper(async (event) => {
    const { familyId } = event.pathParameters;

    if (!familyId) {
        return errorResponse(400, 'Family ID is required');
    }

    try {
        // Get authenticated user
        const authUser = getAuthenticatedUser(event);

        // Check if user belongs to this family
        const user = await dynamoService.getUser(authUser.userId);
        if (!user || user.familyId !== familyId) {
            return errorResponse(403, 'Access denied');
        }

        // Get family members
        const members = await dynamoService.getUsersByFamily(familyId);

        // Return safe user data (no sensitive info)
        const safeMembers = members.map(member => ({
            id: member.id,
            uniqueId: member.uniqueId,
            name: member.name,
            email: member.email,
            role: member.role,
            avatar: member.avatar,
            isActive: member.isActive,
            createdAt: member.createdAt
        }));

        return successResponse(safeMembers);

    } catch (error) {
        if (error.message === 'Unauthorized') {
            return errorResponse(401, 'Authentication required');
        }
        console.error('Error getting family members:', error);
        return errorResponse(500, 'Failed to get family members');
    }
});

/**
 * Generate family invite data
 * POST /api/families/{familyId}/invite
 */
const generateInvite = lambdaWrapper(async (event) => {
    const { familyId } = event.pathParameters;
    const body = parseBody(event.body);

    if (!familyId) {
        return errorResponse(400, 'Family ID is required');
    }

    try {
        // Get authenticated user
        const authUser = getAuthenticatedUser(event);

        // Get family
        const familyData = await dynamoService.getFamily(familyId);
        if (!familyData) {
            return errorResponse(404, 'Family not found');
        }

        const family = new Family(familyData);

        // Check if user is admin or if member invites are allowed
        const isAdmin = family.adminUserId === authUser.userId;
        const user = await dynamoService.getUser(authUser.userId);
        const isMember = user && user.familyId === familyId;

        if (!isAdmin && (!isMember || !family.settings.allowMemberInvites)) {
            return errorResponse(403, 'You do not have permission to generate invites for this family');
        }

        // Regenerate family code if requested
        if (body.regenerateCode && isAdmin) {
            family.regenerateCode();
            await dynamoService.updateFamily(
                familyId,
                'SET familyCode = :familyCode, updatedAt = :updatedAt',
                {
                    ':familyCode': family.familyCode,
                    ':updatedAt': family.updatedAt
                }
            );
        }

        // Generate invite data
        const inviteData = family.generateInviteData();

        return successResponse(inviteData, 'Invite data generated successfully');

    } catch (error) {
        if (error.message === 'Unauthorized') {
            return errorResponse(401, 'Authentication required');
        }
        console.error('Error generating invite:', error);
        return errorResponse(500, 'Failed to generate invite');
    }
});

module.exports = {
    createFamily,
    getCurrentFamily,
    getFamily,
    getFamilyByCode,
    updateFamily,
    getFamilyMembers,
    generateInvite
};