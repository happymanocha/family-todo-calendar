/**
 * Todo Routes
 */

const express = require('express');
const router = express.Router();

const TodoController = require('../controllers/TodoController');
const { verifyToken } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery, schemas } = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     Todo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [task, meeting]
 *         title:
 *           type: string
 *           maxLength: 200
 *         description:
 *           type: string
 *           maxLength: 1000
 *         status:
 *           type: string
 *           enum: [pending, in-progress, completed, cancelled]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         assignedTo:
 *           type: string
 *         createdBy:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date
 *         dueTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         completedAt:
 *           type: string
 *           format: date-time
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *         comments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Comment'
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         meetingLink:
 *           type: string
 *           format: uri
 *         agenda:
 *           type: string
 *           maxLength: 2000
 *         attendees:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         version:
 *           type: integer
 *         isOverdue:
 *           type: boolean
 *         daysUntilDue:
 *           type: integer
 *
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         text:
 *           type: string
 *           maxLength: 500
 *         userId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [user, system]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     CreateTodoRequest:
 *       type: object
 *       required:
 *         - title
 *         - assignedTo
 *       properties:
 *         type:
 *           type: string
 *           enum: [task, meeting]
 *           default: task
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *         description:
 *           type: string
 *           maxLength: 1000
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           default: medium
 *         assignedTo:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date
 *         dueTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 50
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         meetingLink:
 *           type: string
 *           format: uri
 *         agenda:
 *           type: string
 *           maxLength: 2000
 *         attendees:
 *           type: array
 *           items:
 *             type: string
 *
 *     UpdateTodoRequest:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [task, meeting]
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *         description:
 *           type: string
 *           maxLength: 1000
 *         status:
 *           type: string
 *           enum: [pending, in-progress, completed, cancelled]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         assignedTo:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date
 *         dueTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 50
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         meetingLink:
 *           type: string
 *           format: uri
 *         agenda:
 *           type: string
 *           maxLength: 2000
 *         attendees:
 *           type: array
 *           items:
 *             type: string
 *
 *     TodoStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         pending:
 *           type: integer
 *         inProgress:
 *           type: integer
 *         completed:
 *           type: integer
 *         overdue:
 *           type: integer
 *         byType:
 *           type: object
 *           properties:
 *             tasks:
 *               type: integer
 *             meetings:
 *               type: integer
 *         byPriority:
 *           type: object
 *           properties:
 *             low:
 *               type: integer
 *             medium:
 *               type: integer
 *             high:
 *               type: integer
 *             urgent:
 *               type: integer
 */

/**
 * @swagger
 * /api/todos:
 *   get:
 *     summary: Get all todos
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [task, meeting]
 *         description: Filter by type
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Todos retrieved successfully
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
 *                     $ref: '#/components/schemas/Todo'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyToken, validateQuery(schemas.todoQuery), TodoController.getAllTodos);

/**
 * @swagger
 * /api/todos/statistics:
 *   get:
 *     summary: Get todos statistics
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter statistics by user
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                   $ref: '#/components/schemas/TodoStatistics'
 */
router.get('/statistics', verifyToken, validateQuery(schemas.statisticsQuery), TodoController.getStatistics);

/**
 * @swagger
 * /api/todos/upcoming:
 *   get:
 *     summary: Get upcoming todos
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *         description: Number of days to look ahead
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user
 *     responses:
 *       200:
 *         description: Upcoming todos retrieved successfully
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
 *                     $ref: '#/components/schemas/Todo'
 */
router.get('/upcoming', verifyToken, validateQuery(schemas.upcomingQuery), TodoController.getUpcoming);

/**
 * @swagger
 * /api/todos/search:
 *   get:
 *     summary: Search todos
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Search query is required
 */
router.get('/search', verifyToken, TodoController.searchTodos);

/**
 * @swagger
 * /api/todos/{id}:
 *   get:
 *     summary: Get todo by ID
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Todo ID
 *     responses:
 *       200:
 *         description: Todo retrieved successfully
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
 *                   $ref: '#/components/schemas/Todo'
 *       404:
 *         description: Todo not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', verifyToken, validateParams(schemas.todoId), TodoController.getTodoById);

/**
 * @swagger
 * /api/todos:
 *   post:
 *     summary: Create new todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTodoRequest'
 *     responses:
 *       201:
 *         description: Todo created successfully
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
 *                   $ref: '#/components/schemas/Todo'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, validateBody(schemas.createTodo), TodoController.createTodo);

/**
 * @swagger
 * /api/todos/{id}:
 *   put:
 *     summary: Update todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Todo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTodoRequest'
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Todo not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', verifyToken, validateParams(schemas.todoId), validateBody(schemas.updateTodo), TodoController.updateTodo);

/**
 * @swagger
 * /api/todos/{id}/status:
 *   patch:
 *     summary: Update todo status
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Todo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Todo status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Todo not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/status', verifyToken, validateParams(schemas.todoId), validateBody(schemas.updateStatus), TodoController.updateTodoStatus);

/**
 * @swagger
 * /api/todos/{id}:
 *   delete:
 *     summary: Delete todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Todo ID
 *     responses:
 *       200:
 *         description: Todo deleted successfully
 *       404:
 *         description: Todo not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', verifyToken, validateParams(schemas.todoId), TodoController.deleteTodo);

/**
 * @swagger
 * /api/todos/{id}/comments:
 *   post:
 *     summary: Add comment to todo
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Todo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Todo not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/comments', verifyToken, validateParams(schemas.todoId), validateBody(schemas.addComment), TodoController.addComment);

/**
 * @swagger
 * /api/todos/bulk:
 *   patch:
 *     summary: Bulk update todos
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - todoIds
 *               - updateData
 *             properties:
 *               todoIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               updateData:
 *                 $ref: '#/components/schemas/UpdateTodoRequest'
 *     responses:
 *       200:
 *         description: Bulk update completed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/bulk', verifyToken, TodoController.bulkUpdateTodos);

module.exports = router;