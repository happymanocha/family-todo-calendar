/**
 * Family Routes
 */

const express = require('express');
const router = express.Router();

const FamilyController = require('../controllers/FamilyController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateBody, validateParams, schemas } = require('../middleware/validation');
const { apiLimiter, familyCodeLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * components:
 *   schemas:
 *     Family:
 *       type: object
 *       properties:
 *         familyId:
 *           type: string
 *         familyName:
 *           type: string
 *         familyCode:
 *           type: string
 *         adminUserId:
 *           type: string
 *         description:
 *           type: string
 *         memberCount:
 *           type: integer
 *         isActive:
 *           type: boolean
 *         settings:
 *           type: object
 *           properties:
 *             allowMemberInvites:
 *               type: boolean
 *             requireAdminApproval:
 *               type: boolean
 *             maxMembers:
 *               type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/families:
 *   get:
 *     summary: Get all families for current user
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Families retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Family'
 *       401:
 *         description: Unauthorized
 */
router.get('/', apiLimiter, verifyToken, FamilyController.getUserFamilies);

/**
 * @swagger
 * /api/families:
 *   post:
 *     summary: Create new family
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - familyName
 *             properties:
 *               familyName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 200
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowMemberInvites:
 *                     type: boolean
 *                     default: true
 *                   requireAdminApproval:
 *                     type: boolean
 *                     default: false
 *                   maxMembers:
 *                     type: integer
 *                     default: 50
 *     responses:
 *       201:
 *         description: Family created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', apiLimiter, verifyToken, FamilyController.createFamily);

/**
 * @swagger
 * /api/families/join:
 *   post:
 *     summary: Join family using family code
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - familyCode
 *             properties:
 *               familyCode:
 *                 type: string
 *                 description: The unique family code
 *     responses:
 *       200:
 *         description: Successfully joined family
 *       400:
 *         description: Invalid family code
 *       404:
 *         description: Family not found
 *       401:
 *         description: Unauthorized
 */
router.post('/join', familyCodeLimiter, verifyToken, FamilyController.joinFamily);

/**
 * @swagger
 * /api/families/{id}:
 *   get:
 *     summary: Get family by ID
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family ID
 *     responses:
 *       200:
 *         description: Family retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Family'
 *       404:
 *         description: Family not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', apiLimiter, verifyToken, FamilyController.getFamilyById);

/**
 * @swagger
 * /api/families/{id}:
 *   put:
 *     summary: Update family
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               familyName:
 *                 type: string
 *               description:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Family updated successfully
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Family not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', apiLimiter, verifyToken, requireRole('admin'), FamilyController.updateFamily);

/**
 * @swagger
 * /api/families/{id}/members:
 *   get:
 *     summary: Get family members
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family ID
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 *       404:
 *         description: Family not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/members', apiLimiter, verifyToken, FamilyController.getFamilyMembers);

/**
 * @swagger
 * /api/families/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from family
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Family or member not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id/members/:userId', apiLimiter, verifyToken, requireRole('admin'), FamilyController.removeMember);

/**
 * @swagger
 * /api/families/{id}/invite:
 *   get:
 *     summary: Get family invite data
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family ID
 *     responses:
 *       200:
 *         description: Invite data generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     familyCode:
 *                       type: string
 *                     familyName:
 *                       type: string
 *                     shareUrl:
 *                       type: string
 *                     qrCodeData:
 *                       type: string
 *                     whatsappMessage:
 *                       type: string
 *       404:
 *         description: Family not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/invite', apiLimiter, verifyToken, FamilyController.getFamilyInvite);

/**
 * @swagger
 * /api/families/{id}/regenerate-code:
 *   post:
 *     summary: Regenerate family code
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family ID
 *     responses:
 *       200:
 *         description: Code regenerated successfully
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Family not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/regenerate-code', apiLimiter, verifyToken, requireRole('admin'), FamilyController.regenerateFamilyCode);

/**
 * @swagger
 * /api/families/{id}/leave:
 *   post:
 *     summary: Leave family
 *     tags: [Families]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family ID
 *     responses:
 *       200:
 *         description: Successfully left the family
 *       400:
 *         description: Admin cannot leave without transferring role
 *       404:
 *         description: Family not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/leave', apiLimiter, verifyToken, FamilyController.leaveFamily);

module.exports = router;
