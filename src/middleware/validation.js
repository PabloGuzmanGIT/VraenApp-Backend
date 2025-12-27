import { validationResult } from 'express-validator';

/**
 * Middleware to validate request using express-validator
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
        });
    }

    next();
};

/**
 * Error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Prisma errors
    if (err.code === 'P2002') {
        return res.status(409).json({
            error: 'Unique constraint violation',
            field: err.meta?.target?.[0],
        });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({
            error: 'Record not found',
        });
    }

    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
    });
};
