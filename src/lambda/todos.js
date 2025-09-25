/**
 * Todo Lambda Functions
 * Handles todo CRUD operations, status updates, comments, and search
 */

const { DynamoService } = require('../dynamo/dynamoClient');
const {
    lambdaWrapper,
    parseBody,
    validateRequiredFields,
    successResponse,
    errorResponse,
    getAuthenticatedUser,
    generateId,
    validatePagination,
    createPaginatedResponse,
    formatDate
} = require('../utils/lambda-utils');

const dynamoService = new DynamoService();

/**
 * Get todos with filtering and pagination
 */
const getTodos = lambdaWrapper(async (event) => {
    try {
        const user = getAuthenticatedUser(event);
        const queryParams = event.queryStringParameters || {};

        // Validate pagination
        const pagination = validatePagination(queryParams);

        // Extract filter parameters
        const { status, assignedTo, dueDate, search } = queryParams;

        let todos = [];

        if (assignedTo) {
            // Query by assignedTo
            todos = await dynamoService.getTodosByAssignee(assignedTo, dueDate);
        } else if (status) {
            // Query by status
            todos = await dynamoService.getTodosByStatus(status, dueDate);
        } else {
            // Get all family todos (family app - everyone can see all tasks)
            todos = await dynamoService.getAllTodos();
        }

        // Apply search filter if provided
        if (search) {
            const searchLower = search.toLowerCase();
            todos = todos.filter(todo =>
                todo.title.toLowerCase().includes(searchLower) ||
                todo.description.toLowerCase().includes(searchLower) ||
                (todo.tags && todo.tags.some(tag => tag.toLowerCase().includes(searchLower)))
            );
        }

        // Sort by creation date (newest first)
        todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply pagination
        const startIndex = pagination.offset;
        const endIndex = startIndex + pagination.limit;
        const paginatedTodos = todos.slice(startIndex, endIndex);

        const response = createPaginatedResponse(paginatedTodos, pagination, todos.length);

        return successResponse(response, 'Todos retrieved successfully');

    } catch (error) {
        console.error('Get todos error:', error);
        return errorResponse('Failed to get todos', 500, 'GET_TODOS_ERROR');
    }
});

/**
 * Create a new todo
 */
const createTodo = lambdaWrapper(async (event) => {
    const body = parseBody(event);
    validateRequiredFields(body, ['title', 'assignedTo']);

    try {
        const user = getAuthenticatedUser(event);
        const {
            title,
            description,
            assignedTo,
            dueDate,
            priority,
            category,
            tags,
            status
        } = body;

        const todoId = generateId();
        const now = new Date().toISOString();

        const todo = {
            id: todoId,
            userId: user.userId,
            title: title.trim(),
            description: description ? description.trim() : '',
            assignedTo,
            dueDate: formatDate(dueDate),
            priority: priority || 'medium',
            category: category || 'general',
            tags: tags || [],
            status: status || 'pending',
            comments: [],
            createdAt: now,
            updatedAt: now,
            createdBy: user.userId,
            completedAt: null,
            isRecurring: false,
            reminderSet: false
        };

        await dynamoService.putTodo(todo);

        return successResponse(todo, 'Todo created successfully', 201);

    } catch (error) {
        console.error('Create todo error:', error);
        return errorResponse('Failed to create todo', 500, 'CREATE_TODO_ERROR');
    }
});

/**
 * Get a specific todo by ID
 */
const getTodo = lambdaWrapper(async (event) => {
    try {
        const user = getAuthenticatedUser(event);
        const todoId = event.pathParameters.id;

        if (!todoId) {
            return errorResponse('Todo ID is required', 400, 'VALIDATION_ERROR');
        }

        const todo = await dynamoService.getTodo(todoId);

        if (!todo) {
            return errorResponse('Todo not found', 404, 'TODO_NOT_FOUND');
        }

        // Check if user has access to this todo
        if (todo.userId !== user.userId && todo.assignedTo !== user.userId) {
            return errorResponse('Access denied', 403, 'ACCESS_DENIED');
        }

        return successResponse(todo, 'Todo retrieved successfully');

    } catch (error) {
        console.error('Get todo error:', error);
        return errorResponse('Failed to get todo', 500, 'GET_TODO_ERROR');
    }
});

/**
 * Update a todo
 */
const updateTodo = lambdaWrapper(async (event) => {
    const body = parseBody(event);

    try {
        const user = getAuthenticatedUser(event);
        const todoId = event.pathParameters.id;

        if (!todoId) {
            return errorResponse('Todo ID is required', 400, 'VALIDATION_ERROR');
        }

        // Get existing todo
        const existingTodo = await dynamoService.getTodo(todoId);

        if (!existingTodo) {
            return errorResponse('Todo not found', 404, 'TODO_NOT_FOUND');
        }

        // Check if user has access to this todo
        if (existingTodo.userId !== user.userId && existingTodo.assignedTo !== user.userId) {
            return errorResponse('Access denied', 403, 'ACCESS_DENIED');
        }

        // Build update expression
        const updateFields = [];
        const attributeValues = {};
        const attributeNames = {};

        const updatableFields = [
            'title', 'description', 'assignedTo', 'dueDate',
            'priority', 'category', 'tags', 'status'
        ];

        updatableFields.forEach(field => {
            if (body[field] !== undefined) {
                updateFields.push(`#${field} = :${field}`);
                attributeNames[`#${field}`] = field;
                attributeValues[`:${field}`] = field === 'dueDate' ? formatDate(body[field]) : body[field];
            }
        });

        if (updateFields.length === 0) {
            return errorResponse('No valid fields to update', 400, 'VALIDATION_ERROR');
        }

        // Add updatedAt
        updateFields.push('#updatedAt = :updatedAt');
        attributeNames['#updatedAt'] = 'updatedAt';
        attributeValues[':updatedAt'] = new Date().toISOString();

        // If status is being changed to completed, add completedAt
        if (body.status === 'completed' && existingTodo.status !== 'completed') {
            updateFields.push('#completedAt = :completedAt');
            attributeNames['#completedAt'] = 'completedAt';
            attributeValues[':completedAt'] = new Date().toISOString();
        }

        const updateExpression = `SET ${updateFields.join(', ')}`;

        const updatedTodo = await dynamoService.updateTodo(
            todoId,
            updateExpression,
            attributeValues,
            attributeNames
        );

        return successResponse(updatedTodo, 'Todo updated successfully');

    } catch (error) {
        console.error('Update todo error:', error);
        return errorResponse('Failed to update todo', 500, 'UPDATE_TODO_ERROR');
    }
});

/**
 * Delete a todo
 */
const deleteTodo = lambdaWrapper(async (event) => {
    try {
        const user = getAuthenticatedUser(event);
        const todoId = event.pathParameters.id;

        if (!todoId) {
            return errorResponse('Todo ID is required', 400, 'VALIDATION_ERROR');
        }

        // Get existing todo
        const existingTodo = await dynamoService.getTodo(todoId);

        if (!existingTodo) {
            return errorResponse('Todo not found', 404, 'TODO_NOT_FOUND');
        }

        // Check if user has access to delete this todo (only creator or admin)
        if (existingTodo.userId !== user.userId && user.role !== 'admin') {
            return errorResponse('Access denied', 403, 'ACCESS_DENIED');
        }

        await dynamoService.deleteTodo(todoId);

        return successResponse(null, 'Todo deleted successfully');

    } catch (error) {
        console.error('Delete todo error:', error);
        return errorResponse('Failed to delete todo', 500, 'DELETE_TODO_ERROR');
    }
});

/**
 * Update todo status
 */
const updateTodoStatus = lambdaWrapper(async (event) => {
    const body = parseBody(event);
    validateRequiredFields(body, ['status']);

    try {
        const user = getAuthenticatedUser(event);
        const todoId = event.pathParameters.id;
        const { status } = body;

        if (!todoId) {
            return errorResponse('Todo ID is required', 400, 'VALIDATION_ERROR');
        }

        // Validate status
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return errorResponse('Invalid status value', 400, 'VALIDATION_ERROR');
        }

        // Get existing todo
        const existingTodo = await dynamoService.getTodo(todoId);

        if (!existingTodo) {
            return errorResponse('Todo not found', 404, 'TODO_NOT_FOUND');
        }

        // Check if user has access to this todo
        if (existingTodo.userId !== user.userId && existingTodo.assignedTo !== user.userId) {
            return errorResponse('Access denied', 403, 'ACCESS_DENIED');
        }

        // Build update expression
        const updateFields = ['#status = :status', '#updatedAt = :updatedAt'];
        const attributeNames = { '#status': 'status', '#updatedAt': 'updatedAt' };
        const attributeValues = { ':status': status, ':updatedAt': new Date().toISOString() };

        // If status is completed, add completedAt
        if (status === 'completed' && existingTodo.status !== 'completed') {
            updateFields.push('#completedAt = :completedAt');
            attributeNames['#completedAt'] = 'completedAt';
            attributeValues[':completedAt'] = new Date().toISOString();
        }

        const updateExpression = `SET ${updateFields.join(', ')}`;

        const updatedTodo = await dynamoService.updateTodo(
            todoId,
            updateExpression,
            attributeValues,
            attributeNames
        );

        return successResponse(updatedTodo, 'Todo status updated successfully');

    } catch (error) {
        console.error('Update todo status error:', error);
        return errorResponse('Failed to update todo status', 500, 'UPDATE_STATUS_ERROR');
    }
});

/**
 * Add comment to todo
 */
const addComment = lambdaWrapper(async (event) => {
    const body = parseBody(event);
    validateRequiredFields(body, ['comment']);

    try {
        const user = getAuthenticatedUser(event);
        const todoId = event.pathParameters.id;
        const { comment } = body;

        if (!todoId) {
            return errorResponse('Todo ID is required', 400, 'VALIDATION_ERROR');
        }

        // Get existing todo
        const existingTodo = await dynamoService.getTodo(todoId);

        if (!existingTodo) {
            return errorResponse('Todo not found', 404, 'TODO_NOT_FOUND');
        }

        // Check if user has access to this todo
        if (existingTodo.userId !== user.userId && existingTodo.assignedTo !== user.userId) {
            return errorResponse('Access denied', 403, 'ACCESS_DENIED');
        }

        const newComment = {
            id: generateId(),
            text: comment.trim(),
            userId: user.userId,
            userName: user.name,
            createdAt: new Date().toISOString()
        };

        const comments = existingTodo.comments || [];
        comments.push(newComment);

        const updatedTodo = await dynamoService.updateTodo(
            todoId,
            'SET comments = :comments, #updatedAt = :updatedAt',
            {
                ':comments': comments,
                ':updatedAt': new Date().toISOString()
            },
            {
                '#updatedAt': 'updatedAt'
            }
        );

        return successResponse(updatedTodo, 'Comment added successfully');

    } catch (error) {
        console.error('Add comment error:', error);
        return errorResponse('Failed to add comment', 500, 'ADD_COMMENT_ERROR');
    }
});

/**
 * Search todos
 */
const searchTodos = lambdaWrapper(async (event) => {
    try {
        const user = getAuthenticatedUser(event);
        const queryParams = event.queryStringParameters || {};
        const { q: searchQuery, status, assignedTo, category, priority } = queryParams;

        if (!searchQuery || searchQuery.trim().length < 2) {
            return errorResponse('Search query must be at least 2 characters', 400, 'VALIDATION_ERROR');
        }

        // Get all todos for the user
        const todos = await dynamoService.getTodosByUser(user.userId);

        const searchLower = searchQuery.toLowerCase();

        // Filter todos based on search criteria
        let filteredTodos = todos.filter(todo => {
            const titleMatch = todo.title.toLowerCase().includes(searchLower);
            const descriptionMatch = todo.description.toLowerCase().includes(searchLower);
            const tagMatch = todo.tags && todo.tags.some(tag => tag.toLowerCase().includes(searchLower));

            return titleMatch || descriptionMatch || tagMatch;
        });

        // Apply additional filters
        if (status) {
            filteredTodos = filteredTodos.filter(todo => todo.status === status);
        }

        if (assignedTo) {
            filteredTodos = filteredTodos.filter(todo => todo.assignedTo === assignedTo);
        }

        if (category) {
            filteredTodos = filteredTodos.filter(todo => todo.category === category);
        }

        if (priority) {
            filteredTodos = filteredTodos.filter(todo => todo.priority === priority);
        }

        // Sort by relevance (exact title matches first, then by creation date)
        filteredTodos.sort((a, b) => {
            const aExactMatch = a.title.toLowerCase() === searchLower;
            const bExactMatch = b.title.toLowerCase() === searchLower;

            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;

            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return successResponse({
            query: searchQuery,
            results: filteredTodos,
            count: filteredTodos.length
        }, 'Search completed successfully');

    } catch (error) {
        console.error('Search todos error:', error);
        return errorResponse('Search failed', 500, 'SEARCH_ERROR');
    }
});

/**
 * Get todo statistics
 */
const getStatistics = lambdaWrapper(async (event) => {
    try {
        const user = getAuthenticatedUser(event);
        const queryParams = event.queryStringParameters || {};
        const { period = '30' } = queryParams; // days

        // Get all todos for the user
        const todos = await dynamoService.getTodosByUser(user.userId);

        // Filter todos by period if specified
        const periodDays = parseInt(period);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - periodDays);

        const filteredTodos = periodDays > 0
            ? todos.filter(todo => new Date(todo.createdAt) >= cutoffDate)
            : todos;

        // Calculate statistics
        const statistics = {
            total: filteredTodos.length,
            completed: filteredTodos.filter(todo => todo.status === 'completed').length,
            pending: filteredTodos.filter(todo => todo.status === 'pending').length,
            inProgress: filteredTodos.filter(todo => todo.status === 'in-progress').length,
            cancelled: filteredTodos.filter(todo => todo.status === 'cancelled').length,
            overdue: filteredTodos.filter(todo => {
                if (!todo.dueDate || todo.status === 'completed') return false;
                return new Date(todo.dueDate) < new Date();
            }).length,
            byPriority: {
                high: filteredTodos.filter(todo => todo.priority === 'high').length,
                medium: filteredTodos.filter(todo => todo.priority === 'medium').length,
                low: filteredTodos.filter(todo => todo.priority === 'low').length
            },
            byCategory: {},
            byAssignee: {},
            period: `${periodDays} days`
        };

        // Calculate completion rate
        statistics.completionRate = statistics.total > 0
            ? Math.round((statistics.completed / statistics.total) * 100)
            : 0;

        // Group by category
        filteredTodos.forEach(todo => {
            const category = todo.category || 'uncategorized';
            statistics.byCategory[category] = (statistics.byCategory[category] || 0) + 1;
        });

        // Group by assignee
        filteredTodos.forEach(todo => {
            const assignee = todo.assignedTo;
            statistics.byAssignee[assignee] = (statistics.byAssignee[assignee] || 0) + 1;
        });

        return successResponse(statistics, 'Statistics retrieved successfully');

    } catch (error) {
        console.error('Get statistics error:', error);
        return errorResponse('Failed to get statistics', 500, 'STATISTICS_ERROR');
    }
});

/**
 * Get upcoming todos
 */
const getUpcoming = lambdaWrapper(async (event) => {
    try {
        const user = getAuthenticatedUser(event);
        const queryParams = event.queryStringParameters || {};
        const { days = '7', assignedTo } = queryParams;

        // Get todos
        let todos;
        if (assignedTo) {
            todos = await dynamoService.getTodosByAssignee(assignedTo);
        } else {
            todos = await dynamoService.getTodosByUser(user.userId);
        }

        // Filter for upcoming todos
        const dayCount = parseInt(days);
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + dayCount);

        const upcomingTodos = todos.filter(todo => {
            if (!todo.dueDate || todo.status === 'completed' || todo.status === 'cancelled') {
                return false;
            }

            const dueDate = new Date(todo.dueDate);
            return dueDate >= today && dueDate <= futureDate;
        });

        // Sort by due date
        upcomingTodos.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // Group by date
        const groupedByDate = {};
        upcomingTodos.forEach(todo => {
            const dateKey = todo.dueDate;
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(todo);
        });

        return successResponse({
            todos: upcomingTodos,
            groupedByDate,
            period: `${dayCount} days`,
            count: upcomingTodos.length
        }, 'Upcoming todos retrieved successfully');

    } catch (error) {
        console.error('Get upcoming todos error:', error);
        return errorResponse('Failed to get upcoming todos', 500, 'UPCOMING_ERROR');
    }
});

/**
 * Bulk update todos
 */
const bulkUpdate = lambdaWrapper(async (event) => {
    const body = parseBody(event);
    validateRequiredFields(body, ['todoIds', 'updates']);

    try {
        const user = getAuthenticatedUser(event);
        const { todoIds, updates } = body;

        if (!Array.isArray(todoIds) || todoIds.length === 0) {
            return errorResponse('todoIds must be a non-empty array', 400, 'VALIDATION_ERROR');
        }

        if (todoIds.length > 50) {
            return errorResponse('Cannot update more than 50 todos at once', 400, 'VALIDATION_ERROR');
        }

        const results = [];
        const errors = [];

        // Process each todo
        for (const todoId of todoIds) {
            try {
                // Get existing todo
                const existingTodo = await dynamoService.getTodo(todoId);

                if (!existingTodo) {
                    errors.push({ todoId, error: 'Todo not found' });
                    continue;
                }

                // Check access
                if (existingTodo.userId !== user.userId && existingTodo.assignedTo !== user.userId) {
                    errors.push({ todoId, error: 'Access denied' });
                    continue;
                }

                // Build update expression
                const updateFields = [];
                const attributeValues = {};
                const attributeNames = {};

                const updatableFields = ['status', 'priority', 'category', 'assignedTo'];

                updatableFields.forEach(field => {
                    if (updates[field] !== undefined) {
                        updateFields.push(`#${field} = :${field}`);
                        attributeNames[`#${field}`] = field;
                        attributeValues[`:${field}`] = updates[field];
                    }
                });

                if (updateFields.length > 0) {
                    // Add updatedAt
                    updateFields.push('#updatedAt = :updatedAt');
                    attributeNames['#updatedAt'] = 'updatedAt';
                    attributeValues[':updatedAt'] = new Date().toISOString();

                    // If status is being changed to completed, add completedAt
                    if (updates.status === 'completed' && existingTodo.status !== 'completed') {
                        updateFields.push('#completedAt = :completedAt');
                        attributeNames['#completedAt'] = 'completedAt';
                        attributeValues[':completedAt'] = new Date().toISOString();
                    }

                    const updateExpression = `SET ${updateFields.join(', ')}`;

                    const updatedTodo = await dynamoService.updateTodo(
                        todoId,
                        updateExpression,
                        attributeValues,
                        attributeNames
                    );

                    results.push(updatedTodo);
                } else {
                    errors.push({ todoId, error: 'No valid fields to update' });
                }

            } catch (error) {
                console.error(`Bulk update error for todo ${todoId}:`, error);
                errors.push({ todoId, error: error.message });
            }
        }

        return successResponse({
            updated: results,
            errors,
            summary: {
                total: todoIds.length,
                successful: results.length,
                failed: errors.length
            }
        }, 'Bulk update completed');

    } catch (error) {
        console.error('Bulk update error:', error);
        return errorResponse('Bulk update failed', 500, 'BULK_UPDATE_ERROR');
    }
});

module.exports = {
    getTodos,
    createTodo,
    getTodo,
    updateTodo,
    deleteTodo,
    updateTodoStatus,
    addComment,
    searchTodos,
    getStatistics,
    getUpcoming,
    bulkUpdate
};