/**
 * Todo Controller
 * Handles todo/task-related HTTP requests
 */

const TodoService = require('../services/TodoService');

class TodoController {
    /**
     * @desc    Get all todos
     * @route   GET /api/todos
     * @access  Private
     */
    async getAllTodos(req, res) {
        try {
            const filters = req.query;
            const todos = TodoService.getAllTodos(filters);

            res.status(200).json({
                success: true,
                message: 'Todos retrieved successfully',
                data: todos,
                pagination: {
                    page: filters.page || 1,
                    limit: filters.limit || 20,
                    total: todos.length
                }
            });

        } catch (error) {
            console.error('Get todos error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve todos',
                code: 'GET_TODOS_ERROR'
            });
        }
    }

    /**
     * @desc    Get todo by ID
     * @route   GET /api/todos/:id
     * @access  Private
     */
    async getTodoById(req, res) {
        try {
            const { id } = req.params;
            const todo = TodoService.getTodoById(id);

            if (!todo) {
                return res.status(404).json({
                    success: false,
                    message: 'Todo not found',
                    code: 'TODO_NOT_FOUND'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Todo retrieved successfully',
                data: todo
            });

        } catch (error) {
            console.error('Get todo error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve todo',
                code: 'GET_TODO_ERROR'
            });
        }
    }

    /**
     * @desc    Create new todo
     * @route   POST /api/todos
     * @access  Private
     */
    async createTodo(req, res) {
        try {
            const todoData = req.body;
            const userId = req.user.userId;

            const result = TodoService.createTodo(todoData, userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json({
                success: true,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Create todo error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create todo',
                code: 'CREATE_TODO_ERROR'
            });
        }
    }

    /**
     * @desc    Update todo
     * @route   PUT /api/todos/:id
     * @access  Private
     */
    async updateTodo(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const userId = req.user.userId;

            const result = TodoService.updateTodo(id, updateData, userId);

            if (!result.success) {
                if (result.code === 'TODO_NOT_FOUND') {
                    return res.status(404).json(result);
                }
                return res.status(400).json(result);
            }

            res.status(200).json({
                success: true,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Update todo error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update todo',
                code: 'UPDATE_TODO_ERROR'
            });
        }
    }

    /**
     * @desc    Update todo status
     * @route   PATCH /api/todos/:id/status
     * @access  Private
     */
    async updateTodoStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.user.userId;

            const result = TodoService.updateTodoStatus(id, status, userId);

            if (!result.success) {
                if (result.code === 'TODO_NOT_FOUND') {
                    return res.status(404).json(result);
                }
                return res.status(400).json(result);
            }

            res.status(200).json({
                success: true,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Update todo status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update todo status',
                code: 'UPDATE_STATUS_ERROR'
            });
        }
    }

    /**
     * @desc    Delete todo
     * @route   DELETE /api/todos/:id
     * @access  Private
     */
    async deleteTodo(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const result = TodoService.deleteTodo(id, userId);

            if (!result.success) {
                if (result.code === 'TODO_NOT_FOUND') {
                    return res.status(404).json(result);
                }
                return res.status(400).json(result);
            }

            res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            console.error('Delete todo error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete todo',
                code: 'DELETE_TODO_ERROR'
            });
        }
    }

    /**
     * @desc    Add comment to todo
     * @route   POST /api/todos/:id/comments
     * @access  Private
     */
    async addComment(req, res) {
        try {
            const { id } = req.params;
            const comment = req.body;
            const userId = req.user.userId;

            const result = TodoService.addComment(id, comment, userId);

            if (!result.success) {
                if (result.code === 'TODO_NOT_FOUND') {
                    return res.status(404).json(result);
                }
                return res.status(400).json(result);
            }

            res.status(201).json({
                success: true,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Add comment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add comment',
                code: 'ADD_COMMENT_ERROR'
            });
        }
    }

    /**
     * @desc    Get todos statistics
     * @route   GET /api/todos/statistics
     * @access  Private
     */
    async getStatistics(req, res) {
        try {
            const { userId } = req.query;
            const stats = TodoService.getStatistics(userId);

            res.status(200).json({
                success: true,
                message: 'Statistics retrieved successfully',
                data: stats
            });

        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve statistics',
                code: 'GET_STATISTICS_ERROR'
            });
        }
    }

    /**
     * @desc    Get upcoming todos
     * @route   GET /api/todos/upcoming
     * @access  Private
     */
    async getUpcoming(req, res) {
        try {
            const { days, userId } = req.query;
            const upcoming = TodoService.getUpcoming(days, userId);

            res.status(200).json({
                success: true,
                message: 'Upcoming todos retrieved successfully',
                data: upcoming
            });

        } catch (error) {
            console.error('Get upcoming error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve upcoming todos',
                code: 'GET_UPCOMING_ERROR'
            });
        }
    }

    /**
     * @desc    Search todos
     * @route   GET /api/todos/search
     * @access  Private
     */
    async searchTodos(req, res) {
        try {
            const { q: search, ...filters } = req.query;

            if (!search) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required',
                    code: 'SEARCH_QUERY_REQUIRED'
                });
            }

            const todos = TodoService.getAllTodos({ search, ...filters });

            res.status(200).json({
                success: true,
                message: 'Search completed successfully',
                data: todos,
                query: search
            });

        } catch (error) {
            console.error('Search todos error:', error);
            res.status(500).json({
                success: false,
                message: 'Search failed',
                code: 'SEARCH_ERROR'
            });
        }
    }

    /**
     * @desc    Bulk update todos
     * @route   PATCH /api/todos/bulk
     * @access  Private
     */
    async bulkUpdateTodos(req, res) {
        try {
            const { todoIds, updateData } = req.body;
            const userId = req.user.userId;

            if (!todoIds || !Array.isArray(todoIds) || todoIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Todo IDs array is required',
                    code: 'TODO_IDS_REQUIRED'
                });
            }

            const results = todoIds.map(id => {
                return TodoService.updateTodo(id, updateData, userId);
            });

            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            res.status(200).json({
                success: true,
                message: 'Bulk update completed',
                data: {
                    successful: successful.length,
                    failed: failed.length,
                    total: todoIds.length,
                    failures: failed
                }
            });

        } catch (error) {
            console.error('Bulk update error:', error);
            res.status(500).json({
                success: false,
                message: 'Bulk update failed',
                code: 'BULK_UPDATE_ERROR'
            });
        }
    }
}

module.exports = new TodoController();