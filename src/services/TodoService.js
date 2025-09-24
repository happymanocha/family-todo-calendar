/**
 * Todo Service
 * Handles todo/task business logic operations
 */

const Todo = require('../models/Todo');

class TodoService {
    constructor() {
        // In-memory storage for demo (will be replaced with database)
        this.todos = new Map();
        this.initializeSampleData();
    }

    /**
     * Initialize with sample data
     */
    initializeSampleData() {
        const sampleTodos = [
            new Todo({
                title: 'Plan family vacation',
                description: 'Research destinations and book flights',
                type: 'task',
                status: 'pending',
                priority: 'high',
                assignedTo: 'happy',
                createdBy: 'happy',
                dueDate: '2024-10-15',
                dueTime: '18:00',
                tags: ['vacation', 'family']
            }),
            new Todo({
                title: 'Weekly family meeting',
                description: 'Discuss upcoming events and tasks',
                type: 'meeting',
                status: 'pending',
                priority: 'medium',
                assignedTo: 'all',
                createdBy: 'happy',
                dueDate: '2024-09-25',
                startTime: '2024-09-25T19:00:00',
                endTime: '2024-09-25T20:00:00',
                agenda: '1. Review last week\n2. Plan upcoming events\n3. Assign new tasks',
                attendees: ['happy', 'joel', 'monika', 'kiaan']
            })
        ];

        sampleTodos.forEach(todo => {
            this.todos.set(todo.id, todo);
        });
    }

    /**
     * Get all todos with optional filtering
     * @param {Object} filters Filter options
     * @returns {Array} Array of todos
     */
    getAllTodos(filters = {}) {
        let todos = Array.from(this.todos.values());

        // Apply filters
        if (filters.assignedTo && filters.assignedTo !== 'all') {
            todos = todos.filter(todo =>
                todo.assignedTo === filters.assignedTo ||
                (todo.type === 'meeting' && todo.attendees.includes(filters.assignedTo))
            );
        }

        if (filters.status) {
            todos = todos.filter(todo => todo.status === filters.status);
        }

        if (filters.type) {
            todos = todos.filter(todo => todo.type === filters.type);
        }

        if (filters.priority) {
            todos = todos.filter(todo => todo.priority === filters.priority);
        }

        if (filters.tag) {
            todos = todos.filter(todo => todo.tags.includes(filters.tag));
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            todos = todos.filter(todo =>
                todo.title.toLowerCase().includes(searchTerm) ||
                todo.description.toLowerCase().includes(searchTerm)
            );
        }

        // Sort by creation date (newest first)
        todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply pagination
        if (filters.page && filters.limit) {
            const start = (filters.page - 1) * filters.limit;
            const end = start + filters.limit;
            todos = todos.slice(start, end);
        }

        return todos.map(todo => todo.toJSON());
    }

    /**
     * Get todo by ID
     * @param {string} id Todo ID
     * @returns {Object|null} Todo data or null
     */
    getTodoById(id) {
        const todo = this.todos.get(id);
        return todo ? todo.toJSON() : null;
    }

    /**
     * Create new todo
     * @param {Object} todoData Todo data
     * @param {string} userId User creating the todo
     * @returns {Object} Creation result
     */
    createTodo(todoData, userId) {
        try {
            const todo = new Todo({
                ...todoData,
                createdBy: userId
            });

            const validation = todo.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                };
            }

            this.todos.set(todo.id, todo);

            return {
                success: true,
                message: 'Todo created successfully',
                data: todo.toJSON()
            };

        } catch (error) {
            console.error('Error creating todo:', error);
            return {
                success: false,
                message: 'Failed to create todo',
                error: error.message
            };
        }
    }

    /**
     * Update todo
     * @param {string} id Todo ID
     * @param {Object} updateData Update data
     * @param {string} userId User updating the todo
     * @returns {Object} Update result
     */
    updateTodo(id, updateData, userId) {
        try {
            const todo = this.todos.get(id);
            if (!todo) {
                return {
                    success: false,
                    message: 'Todo not found',
                    code: 'TODO_NOT_FOUND'
                };
            }

            // Update fields
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && key !== 'id') {
                    todo[key] = updateData[key];
                }
            });

            todo.updatedAt = new Date().toISOString();
            todo.version += 1;

            const validation = todo.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                };
            }

            // Add update comment
            todo.addComment({
                text: 'Todo updated',
                userId: userId,
                type: 'system'
            });

            return {
                success: true,
                message: 'Todo updated successfully',
                data: todo.toJSON()
            };

        } catch (error) {
            console.error('Error updating todo:', error);
            return {
                success: false,
                message: 'Failed to update todo',
                error: error.message
            };
        }
    }

    /**
     * Update todo status
     * @param {string} id Todo ID
     * @param {string} status New status
     * @param {string} userId User updating the status
     * @returns {Object} Update result
     */
    updateTodoStatus(id, status, userId) {
        try {
            const todo = this.todos.get(id);
            if (!todo) {
                return {
                    success: false,
                    message: 'Todo not found',
                    code: 'TODO_NOT_FOUND'
                };
            }

            todo.updateStatus(status, userId);

            return {
                success: true,
                message: 'Todo status updated successfully',
                data: todo.toJSON()
            };

        } catch (error) {
            console.error('Error updating todo status:', error);
            return {
                success: false,
                message: 'Failed to update todo status',
                error: error.message
            };
        }
    }

    /**
     * Delete todo
     * @param {string} id Todo ID
     * @param {string} userId User deleting the todo
     * @returns {Object} Deletion result
     */
    deleteTodo(id, userId) {
        try {
            const todo = this.todos.get(id);
            if (!todo) {
                return {
                    success: false,
                    message: 'Todo not found',
                    code: 'TODO_NOT_FOUND'
                };
            }

            this.todos.delete(id);

            return {
                success: true,
                message: 'Todo deleted successfully'
            };

        } catch (error) {
            console.error('Error deleting todo:', error);
            return {
                success: false,
                message: 'Failed to delete todo',
                error: error.message
            };
        }
    }

    /**
     * Add comment to todo
     * @param {string} id Todo ID
     * @param {Object} comment Comment data
     * @param {string} userId User adding the comment
     * @returns {Object} Result
     */
    addComment(id, comment, userId) {
        try {
            const todo = this.todos.get(id);
            if (!todo) {
                return {
                    success: false,
                    message: 'Todo not found',
                    code: 'TODO_NOT_FOUND'
                };
            }

            todo.addComment({
                text: comment.text,
                userId: userId,
                type: 'user'
            });

            return {
                success: true,
                message: 'Comment added successfully',
                data: todo.toJSON()
            };

        } catch (error) {
            console.error('Error adding comment:', error);
            return {
                success: false,
                message: 'Failed to add comment',
                error: error.message
            };
        }
    }

    /**
     * Get todos statistics
     * @param {string} userId User ID (optional)
     * @returns {Object} Statistics
     */
    getStatistics(userId = null) {
        let todos = Array.from(this.todos.values());

        if (userId) {
            todos = todos.filter(todo =>
                todo.assignedTo === userId ||
                (todo.type === 'meeting' && todo.attendees.includes(userId))
            );
        }

        const stats = {
            total: todos.length,
            pending: todos.filter(t => t.status === 'pending').length,
            inProgress: todos.filter(t => t.status === 'in-progress').length,
            completed: todos.filter(t => t.status === 'completed').length,
            overdue: todos.filter(t => t.isOverdue()).length,
            byType: {
                tasks: todos.filter(t => t.type === 'task').length,
                meetings: todos.filter(t => t.type === 'meeting').length
            },
            byPriority: {
                low: todos.filter(t => t.priority === 'low').length,
                medium: todos.filter(t => t.priority === 'medium').length,
                high: todos.filter(t => t.priority === 'high').length,
                urgent: todos.filter(t => t.priority === 'urgent').length
            }
        };

        return stats;
    }

    /**
     * Get upcoming todos/meetings
     * @param {number} days Number of days to look ahead
     * @param {string} userId User ID (optional)
     * @returns {Array} Upcoming todos
     */
    getUpcoming(days = 7, userId = null) {
        let todos = Array.from(this.todos.values());

        if (userId) {
            todos = todos.filter(todo =>
                todo.assignedTo === userId ||
                (todo.type === 'meeting' && todo.attendees.includes(userId))
            );
        }

        const now = new Date();
        const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

        return todos
            .filter(todo => {
                if (!todo.dueDate) return false;
                const dueDate = new Date(todo.dueDate);
                return dueDate >= now && dueDate <= futureDate;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(todo => todo.toJSON());
    }
}

module.exports = new TodoService();