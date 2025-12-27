import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               language:
 *                 type: string
 *                 enum: [es, en]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post(
    '/register',
    [
        body('email').isEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name').optional().trim(),
        body('phone').optional().trim(),
        body('language').optional().isIn(['es', 'en']),
    ],
    validate,
    async (req, res) => {
        try {
            const { email, password, name, phone, language } = req.body;

            // Check if user exists
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                return res.status(409).json({ error: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    phone,
                    language: language || 'es',
                    role: 'OPERATOR',
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    language: true,
                    theme: true,
                    createdAt: true,
                },
            });

            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.status(201).json({
                message: 'User registered successfully',
                user,
                token,
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email required'),
        body('password').notEmpty().withMessage('Password required'),
    ],
    validate,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await prisma.user.findUnique({
                where: { email },
            });

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Return user without password
            const { password: _, ...userWithoutPassword } = user;

            res.json({
                message: 'Login successful',
                user: userWithoutPassword,
                token,
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: User not found
 */
router.post(
    '/forgot-password',
    [body('email').isEmail().withMessage('Valid email required')],
    validate,
    async (req, res) => {
        try {
            const { email } = req.body;

            const user = await prisma.user.findUnique({
                where: { email },
            });

            if (!user) {
                // Don't reveal if user exists
                return res.json({ message: 'If the email exists, a reset link has been sent' });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

            // Store token (you might want to add a PasswordReset model)
            // For now, we'll use JWT with short expiry
            const resetJWT = jwt.sign(
                { userId: user.id, email: user.email, type: 'password-reset' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Send email
            await sendPasswordResetEmail(user.email, user.name, resetJWT, user.language);

            res.json({ message: 'If the email exists, a reset link has been sent' });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ error: 'Failed to process request' });
        }
    }
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post(
    '/reset-password',
    [
        body('token').notEmpty().withMessage('Token required'),
        body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    validate,
    async (req, res) => {
        try {
            const { token, newPassword } = req.body;

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.type !== 'password-reset') {
                return res.status(400).json({ error: 'Invalid token' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            await prisma.user.update({
                where: { id: decoded.userId },
                data: { password: hashedPassword },
            });

            res.json({ message: 'Password reset successful' });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(400).json({ error: 'Reset token expired' });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(400).json({ error: 'Invalid token' });
            }
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }
);

export default router;
