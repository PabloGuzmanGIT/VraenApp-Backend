import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/validation.js';

// Import routes
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import providerRoutes from './routes/providers.js';
import transactionRoutes from './routes/transactions.js';
import expenseRoutes from './routes/expenses.js';
import syncRoutes from './routes/sync.js';
import analyticsRoutes from './routes/analytics.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// SWAGGER DOCUMENTATION
// ============================================

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Health Check
 *     description: Returns API status and version
 *     responses:
 *       200:
 *         description: API is running
 */
app.get('/', (req, res) => {
    res.json({
        message: 'Control de Compra API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api-docs',
    });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Control de Compra API Docs',
}));

// Swagger JSON
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ============================================
// ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/analytics', analyticsRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Control de Compra API Server');
    console.log('================================');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('================================');
    console.log('');
});

export default app;
