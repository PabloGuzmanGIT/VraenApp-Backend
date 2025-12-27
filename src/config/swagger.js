import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Control de Compra API',
            version: '1.0.0',
            description: 'API documentation for Control de Compra - Offline-first purchase management system',
            contact: {
                name: 'API Support',
                email: 'support@controldecompra.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://api.controldecompra.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                        details: {
                            type: 'array',
                            items: {
                                type: 'object',
                            },
                            description: 'Additional error details',
                        },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                        },
                        name: {
                            type: 'string',
                        },
                        role: {
                            type: 'string',
                            enum: ['ADMIN', 'OPERATOR'],
                        },
                        language: {
                            type: 'string',
                            enum: ['es', 'en'],
                        },
                        theme: {
                            type: 'string',
                            enum: ['light', 'dark'],
                        },
                    },
                },
                Transaction: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        contractNumber: {
                            type: 'string',
                            description: 'Unique contract number (YYYYMMDD-UUID format)',
                        },
                        description: {
                            type: 'string',
                        },
                        status: {
                            type: 'string',
                            enum: ['ACTIVE', 'CLOSED'],
                        },
                        quantity: {
                            type: 'number',
                            format: 'float',
                        },
                        unitPrice: {
                            type: 'number',
                            format: 'float',
                        },
                        totalAmount: {
                            type: 'number',
                            format: 'float',
                        },
                        transactionDate: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints',
            },
            {
                name: 'Users',
                description: 'User management endpoints',
            },
            {
                name: 'Organizations',
                description: 'Organization management endpoints',
            },
            {
                name: 'Transactions',
                description: 'Transaction CRUD and management endpoints',
            },
            {
                name: 'Providers',
                description: 'Provider management endpoints',
            },
            {
                name: 'Expenses',
                description: 'Expense tracking endpoints',
            },
            {
                name: 'Sync',
                description: 'Offline-first synchronization endpoints',
            },
            {
                name: 'Analytics',
                description: 'Analytics and reporting endpoints',
            },
            {
                name: 'Uploads',
                description: 'File upload endpoints (photos, signatures)',
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/server.js'], // Path to API docs
};

export const swaggerSpec = swaggerJsdoc(options);
