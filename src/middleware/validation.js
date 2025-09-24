/**
 * Validation Middleware
 * Handles request validation using Joi schemas
 */

const Joi = require('joi');

/**
 * Validate request body
 * @param {Object} schema Joi validation schema
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors,
                code: 'VALIDATION_ERROR'
            });
        }

        req.body = value;
        next();
    };
};

/**
 * Validate request parameters
 * @param {Object} schema Joi validation schema
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Parameter validation failed',
                errors: errors,
                code: 'PARAM_VALIDATION_ERROR'
            });
        }

        req.params = value;
        next();
    };
};

/**
 * Validate query parameters
 * @param {Object} schema Joi validation schema
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Query validation failed',
                errors: errors,
                code: 'QUERY_VALIDATION_ERROR'
            });
        }

        req.query = value;
        next();
    };
};

// Common validation schemas
const schemas = {
    // Authentication schemas
    login: Joi.object({
        email: Joi.string().email().required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required'
            }),
        password: Joi.string().min(6).required()
            .messages({
                'string.min': 'Password must be at least 6 characters long',
                'any.required': 'Password is required'
            }),
        rememberMe: Joi.boolean().default(false)
    }),

    refreshToken: Joi.object({
        refreshToken: Joi.string().required()
            .messages({
                'any.required': 'Refresh token is required'
            })
    }),

    // Todo schemas
    createTodo: Joi.object({
        type: Joi.string().valid('task', 'meeting').default('task'),
        title: Joi.string().min(1).max(200).required()
            .messages({
                'string.min': 'Title cannot be empty',
                'string.max': 'Title must be less than 200 characters',
                'any.required': 'Title is required'
            }),
        description: Joi.string().max(1000).allow(''),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
        assignedTo: Joi.string().required()
            .messages({
                'any.required': 'Assigned user is required'
            }),
        dueDate: Joi.date().iso().allow(null),
        dueTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
        tags: Joi.array().items(Joi.string().max(50)).default([]),

        // Meeting specific fields
        startTime: Joi.when('type', {
            is: 'meeting',
            then: Joi.date().iso(),
            otherwise: Joi.forbidden()
        }),
        endTime: Joi.when('type', {
            is: 'meeting',
            then: Joi.date().iso().greater(Joi.ref('startTime')),
            otherwise: Joi.forbidden()
        }),
        meetingLink: Joi.when('type', {
            is: 'meeting',
            then: Joi.string().uri().allow(''),
            otherwise: Joi.forbidden()
        }),
        agenda: Joi.when('type', {
            is: 'meeting',
            then: Joi.string().max(2000).allow(''),
            otherwise: Joi.forbidden()
        }),
        attendees: Joi.when('type', {
            is: 'meeting',
            then: Joi.array().items(Joi.string()).default([]),
            otherwise: Joi.forbidden()
        })
    }),

    updateTodo: Joi.object({
        type: Joi.string().valid('task', 'meeting'),
        title: Joi.string().min(1).max(200),
        description: Joi.string().max(1000).allow(''),
        status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled'),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
        assignedTo: Joi.string(),
        dueDate: Joi.date().iso().allow(null),
        dueTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
        tags: Joi.array().items(Joi.string().max(50)),

        // Meeting specific fields
        startTime: Joi.date().iso(),
        endTime: Joi.date().iso(),
        meetingLink: Joi.string().uri().allow(''),
        agenda: Joi.string().max(2000).allow(''),
        attendees: Joi.array().items(Joi.string())
    }).min(1),

    updateStatus: Joi.object({
        status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled').required()
            .messages({
                'any.required': 'Status is required',
                'any.only': 'Status must be one of: pending, in-progress, completed, cancelled'
            })
    }),

    addComment: Joi.object({
        text: Joi.string().min(1).max(500).required()
            .messages({
                'string.min': 'Comment cannot be empty',
                'string.max': 'Comment must be less than 500 characters',
                'any.required': 'Comment text is required'
            })
    }),

    // Parameter schemas
    todoId: Joi.object({
        id: Joi.string().uuid().required()
            .messages({
                'string.guid': 'Invalid todo ID format',
                'any.required': 'Todo ID is required'
            })
    }),

    // Query schemas
    todoQuery: Joi.object({
        assignedTo: Joi.string().allow(''),
        status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled'),
        type: Joi.string().valid('task', 'meeting'),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
        tag: Joi.string(),
        search: Joi.string().max(100),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    }),

    statisticsQuery: Joi.object({
        userId: Joi.string().allow('')
    }),

    upcomingQuery: Joi.object({
        days: Joi.number().integer().min(1).max(365).default(7),
        userId: Joi.string().allow('')
    })
};

module.exports = {
    validateBody,
    validateParams,
    validateQuery,
    schemas
};