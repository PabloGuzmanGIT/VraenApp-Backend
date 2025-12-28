import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/expenses/categories:
 *   get:
 *     summary: Get all expense categories
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expense categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const categories = await prisma.expenseCategory.findMany({
            where: {
                OR: [
                    { isDefault: true },
                    { userId: req.user.id },
                ],
            },
            orderBy: [
                { isDefault: 'desc' },
                { name: 'asc' },
            ],
        });

        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * @swagger
 * /api/expenses/categories:
 *   post:
 *     summary: Create custom expense category
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               nameEn:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post(
    '/categories',
    authenticateToken,
    [
        body('name').trim().notEmpty().withMessage('Category name required'),
        body('nameEn').optional().trim(),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, nameEn } = req.body;

            const category = await prisma.expenseCategory.create({
                data: {
                    name,
                    nameEn,
                    userId: req.user.id,
                    isDefault: false,
                },
            });

            res.status(201).json({
                message: 'Category created successfully',
                category,
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({ error: 'Failed to create category' });
        }
    }
);

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: transactionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: general
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of expenses
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { transactionId, categoryId, general } = req.query;

        const where = {};

        if (transactionId) {
            where.transactionId = transactionId;
        } else if (general === 'true') {
            where.transactionId = null;
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        // Get expenses from user's transactions or general expenses
        const expenses = await prisma.expense.findMany({
            where: {
                ...where,
                OR: [
                    { transaction: { userId: req.user.id } },
                    { transactionId: null }, // General expenses
                ],
            },
            include: {
                category: true,
                transaction: {
                    select: {
                        id: true,
                        contractNumber: true,
                        description: true,
                    },
                },
            },
            orderBy: {
                expenseDate: 'desc',
            },
        });

        res.json({ expenses });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create general expense (not linked to transaction)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - categoryId
 *             properties:
 *               amount:
 *                 type: number
 *               categoryId:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Expense created successfully
 */
router.post(
    '/',
    authenticateToken,
    [
        body('amount').isFloat({ min: 0.01 }),
        body('categoryId').isUUID(),
        body('description').optional().trim(),
    ],
    validate,
    async (req, res) => {
        try {
            const { amount, categoryId, description } = req.body;

            const expense = await prisma.expense.create({
                data: {
                    amount,
                    categoryId,
                    description,
                    transactionId: null, // General expense
                },
                include: {
                    category: true,
                },
            });

            res.status(201).json({
                message: 'Expense created successfully',
                expense,
            });
        } catch (error) {
            console.error('Create expense error:', error);
            res.status(500).json({ error: 'Failed to create expense' });
        }
    }
);

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 */
router.delete(
    '/:id',
    authenticateToken,
    [param('id').isUUID()],
    validate,
    async (req, res) => {
        try {
            // Verify ownership through transaction
            const expense = await prisma.expense.findFirst({
                where: {
                    id: req.params.id,
                    OR: [
                        { transaction: { userId: req.user.id } },
                        { transactionId: null }, // General expense
                    ],
                },
            });

            if (!expense) {
                return res.status(404).json({ error: 'Expense not found' });
            }

            await prisma.expense.delete({
                where: { id: req.params.id },
            });

            res.json({ message: 'Expense deleted successfully' });
        } catch (error) {
            console.error('Delete expense error:', error);
            res.status(500).json({ error: 'Failed to delete expense' });
        }
    }
);

export default router;
