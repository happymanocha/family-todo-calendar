/**
 * Swagger/OpenAPI Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: "Minocha's Organizer API",
            version: '1.0.0',
            description: `
# Minocha's Organizer API

A comprehensive family organization API built with Express.js and following MVC architecture patterns.

## Features

🔐 **Authentication & Authorization**
- JWT-based authentication with refresh tokens
- Role-based access control (admin/member)
- Session management with configurable expiration
- Family member management

📋 **Task Management**
- Complete task lifecycle (pending → in-progress → completed)
- Meeting scheduling with time ranges and agenda
- Priority levels and status tracking
- Comments and activity logs
- Tag-based organization

👨‍👩‍👧‍👦 **Family Collaboration**
- Multi-user assignments
- Family member specific views
- Shared calendars and schedules
- Real-time notifications

📊 **Analytics & Reporting**
- Task completion statistics
- Overdue item tracking
- Priority distribution analysis
- Upcoming deadlines

🔍 **Advanced Features**
- Full-text search across tasks and meetings
- Advanced filtering and sorting
- Bulk operations
- Data export capabilities

## Architecture

This API follows **MVC (Model-View-Controller)** architecture with:
- **Models**: Data structures and business logic
- **Controllers**: Request/response handling
- **Services**: Business logic layer
- **Middleware**: Authentication, validation, logging
- **Routes**: API endpoint definitions

## Security

- CORS protection
- Helmet.js security headers
- Input validation with Joi schemas
- JWT token-based authentication
- Rate limiting protection

## Getting Started

1. **Authentication**: Start with \`POST /api/auth/login\`
2. **Get Profile**: Use \`GET /api/auth/profile\` with Bearer token
3. **Manage Todos**: Create, read, update, delete via \`/api/todos/*\`
4. **Statistics**: View analytics with \`GET /api/todos/statistics\`

All endpoints require authentication except login and registration.
            `,
            contact: {
                name: 'Minocha Family',
                email: 'happymanocha@gmail.com'
            },
            license: {
                name: 'MIT License',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://api.minocha-organizer.com',
                description: 'Production server'
            }
        ],
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints'
            },
            {
                name: 'Todos',
                description: 'Task and meeting management endpoints'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Access token is required'
                                    },
                                    code: {
                                        type: 'string',
                                        example: 'TOKEN_MISSING'
                                    }
                                }
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Request validation failed',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Validation failed'
                                    },
                                    errors: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                field: {
                                                    type: 'string',
                                                    example: 'email'
                                                },
                                                message: {
                                                    type: 'string',
                                                    example: 'Please provide a valid email address'
                                                },
                                                value: {
                                                    type: 'string',
                                                    example: 'invalid-email'
                                                }
                                            }
                                        }
                                    },
                                    code: {
                                        type: 'string',
                                        example: 'VALIDATION_ERROR'
                                    }
                                }
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Resource not found'
                                    },
                                    code: {
                                        type: 'string',
                                        example: 'NOT_FOUND'
                                    }
                                }
                            }
                        }
                    }
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: false
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Internal server error'
                                    },
                                    code: {
                                        type: 'string',
                                        example: 'SERVER_ERROR'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../models/*.js'),
        path.join(__dirname, '../controllers/*.js')
    ]
};

const specs = swaggerJsdoc(options);

// Custom CSS for Swagger UI
const customCss = `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #6366f1; }
    .swagger-ui .info .description p { margin: 1em 0; }
    .swagger-ui .info .description h1 { color: #1e293b; margin-top: 2em; }
    .swagger-ui .info .description h2 { color: #374151; margin-top: 1.5em; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; }
    .swagger-ui .btn.authorize { background-color: #6366f1; border-color: #6366f1; }
    .swagger-ui .btn.authorize:hover { background-color: #4f46e5; }
`;

const swaggerOptions = {
    customCss,
    customSiteTitle: "Minocha's Organizer API Documentation",
    customfavIcon: '/assets/favicon.ico',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete']
    }
};

module.exports = {
    specs,
    swaggerUi,
    swaggerOptions
};