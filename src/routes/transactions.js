import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateContractNumber, calculateBalances } from '../utils/transactionHelpers.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *             properties:
 *               providerId:
 *                 type: string
 *               productServiceId:
 *                 type: string
 *               description:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unitPrice:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               organizationId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction created successfully
 */
router.post(
    '/',
    authenticateToken,
    [
        body('providerId').isUUID().withMessage('Valid provider ID required'),
        body('productServiceId').optional().isUUID(),
        body('description').optional().trim(),
        body('quantity').optional().isFloat({ min: 0 }),
        body('unitPrice').optional().isFloat({ min: 0 }),
        body('totalAmount').optional().isFloat({ min: 0 }),
        body('organizationId').optional().isUUID(),
    ],
    validate,
    async (req, res) => {
        try {
            const {
                providerId,
                productServiceId,
                description,
                quantity,
                unitPrice,
                totalAmount,
                organizationId,
            } = req.body;

            // Generate unique contract number
            const contractNumber = generateContractNumber();

            // Calculate total if not provided
            const calculatedTotal = totalAmount || (quantity && unitPrice ? quantity * unitPrice : null);

            const transaction = await prisma.transaction.create({
                data: {
                    contractNumber,
                    description,
                    quantity,
                    unitPrice,
                    totalAmount: calculatedTotal,
                    userId: req.user.id,
                    providerId,
                    productServiceId,
                    organizationId,
                },
                include: {
                    provider: true,
                    productService: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            });

            res.status(201).json({
                message: 'Transaction created successfully',
                transaction,
            });
        } catch (error) {
            console.error('Create transaction error:', error);
            res.status(500).json({ error: 'Failed to create transaction' });
        }
    }
);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, CLOSED]
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, providerId, organizationId, search } = req.query;

        const where = {
            OR: [
                { userId: req.user.id },
                organizationId ? { organizationId } : {},
            ],
        };

        if (status) {
            where.status = status;
        }

        if (providerId) {
            where.providerId = providerId;
        }

        if (search) {
            where.OR = [
                { contractNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                provider: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                productService: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        advances: true,
                        deliveries: true,
                        expenses: true,
                    },
                },
            },
            orderBy: {
                transactionDate: 'desc',
            },
        });

        res.json({ transactions });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
}
);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID with full details
 *     tags: [Transactions]
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
 *         description: Transaction details
 */
router.get(
    '/:id',
    authenticateToken,
    [param('id').isUUID()],
    validate,
    async (req, res) => {
        try {
            const transaction = await prisma.transaction.findFirst({
                where: {
                    id: req.params.id,
                    OR: [
                        { userId: req.user.id },
                        { organization: { members: { some: { userId: req.user.id } } } },
                    ],
                },
                include: {
                    provider: true,
                    productService: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                    advances: {
                        orderBy: {
                            advanceDate: 'desc',
                        },
                    },
                    deliveries: {
                        orderBy: {
                            deliveryDate: 'desc',
                        },
                    },
                    expenses: {
                        include: {
                            category: true,
                        },
                        orderBy: {
                            expenseDate: 'desc',
                        },
                    },
                    attachments: {
                        orderBy: {
                            createdAt: 'desc',
                        },
                    },
                },
            });

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            // Calculate balances
            const balances = calculateBalances(
                transaction,
                transaction.advances,
                transaction.deliveries
            );

            res.json({
                transaction,
                balances,
            });
        } catch (error) {
            console.error('Get transaction error:', error);
            res.status(500).json({ error: 'Failed to fetch transaction' });
        }
    }
);

/**
 * @swagger
 * /api/transactions/{id}:
 *   patch:
 *     summary: Update transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unitPrice:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 */
router.patch(
    '/:id',
    authenticateToken,
    [
        param('id').isUUID(),
        body('description').optional().trim(),
        body('quantity').optional().isFloat({ min: 0 }),
        body('unitPrice').optional().isFloat({ min: 0 }),
        body('totalAmount').optional().isFloat({ min: 0 }),
    ],
    validate,
    async (req, res) => {
        try {
            const { description, quantity, unitPrice, totalAmount } = req.body;

            const updated = await prisma.transaction.updateMany({
                where: {
                    id: req.params.id,
                    userId: req.user.id,
                    status: 'ACTIVE', // Only allow editing active transactions
                },
                data: {
                    ...(description !== undefined && { description }),
                    ...(quantity !== undefined && { quantity }),
                    ...(unitPrice !== undefined && { unitPrice }),
                    ...(totalAmount !== undefined && { totalAmount }),
                },
            });

            if (updated.count === 0) {
                return res.status(404).json({ error: 'Transaction not found or cannot be edited' });
            }

            const transaction = await prisma.transaction.findUnique({
                where: { id: req.params.id },
                include: {
                    provider: true,
                    productService: true,
                },
            });

            res.json({
                message: 'Transaction updated successfully',
                transaction,
            });
        } catch (error) {
            console.error('Update transaction error:', error);
            res.status(500).json({ error: 'Failed to update transaction' });
        }
    }
);

/**
 * @swagger
 * /api/transactions/{id}/close:
 *   post:
 *     summary: Close a transaction
 *     tags: [Transactions]
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
 *         description: Transaction closed successfully
 */
router.post(
    '/:id/close',
    authenticateToken,
    [param('id').isUUID()],
    validate,
    async (req, res) => {
        try {
            const transaction = await prisma.transaction.updateMany({
                where: {
                    id: req.params.id,
                    userId: req.user.id,
                    status: 'ACTIVE',
                },
                data: {
                    status: 'CLOSED',
                    closedAt: new Date(),
                },
            });

            if (transaction.count === 0) {
                return res.status(404).json({ error: 'Transaction not found or already closed' });
            }

            res.json({ message: 'Transaction closed successfully' });
        } catch (error) {
            console.error('Close transaction error:', error);
            res.status(500).json({ error: 'Failed to close transaction' });
        }
    }
);

// ============================================
// ADVANCES
// ============================================

/**
 * @swagger
 * /api/transactions/{id}/advances:
 *   post:
 *     summary: Add advance payment to transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Advance added successfully
 */
router.post(
    '/:id/advances',
    authenticateToken,
    [
        param('id').isUUID(),
        body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
        body('description').optional().trim(),
    ],
    validate,
    async (req, res) => {
        try {
            const { amount, description } = req.body;

            // Verify transaction ownership
            const transaction = await prisma.transaction.findFirst({
                where: {
                    id: req.params.id,
                    userId: req.user.id,
                    status: 'ACTIVE',
                },
            });

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found or cannot be modified' });
            }

            const advance = await prisma.advance.create({
                data: {
                    amount,
                    description,
                    transactionId: req.params.id,
                },
            });

            res.status(201).json({
                message: 'Advance added successfully',
                advance,
            });
        } catch (error) {
            console.error('Add advance error:', error);
            res.status(500).json({ error: 'Failed to add advance' });
        }
    }
);

// ============================================
// DELIVERIES
// ============================================

/**
 * @swagger
 * /api/transactions/{id}/deliveries:
 *   post:
 *     summary: Add delivery to transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Delivery added successfully
 */
router.post(
    '/:id/deliveries',
    authenticateToken,
    [
        param('id').isUUID(),
        body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
        body('description').optional().trim(),
    ],
    validate,
    async (req, res) => {
        try {
            const { quantity, description } = req.body;

            // Verify transaction ownership
            const transaction = await prisma.transaction.findFirst({
                where: {
                    id: req.params.id,
                    userId: req.user.id,
                    status: 'ACTIVE',
                },
            });

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found or cannot be modified' });
            }

            const delivery = await prisma.delivery.create({
                data: {
                    quantity,
                    description,
                    transactionId: req.params.id,
                },
            });

            res.status(201).json({
                message: 'Delivery added successfully',
                delivery,
            });
        } catch (error) {
            console.error('Add delivery error:', error);
            res.status(500).json({ error: 'Failed to add delivery' });
        }
    }
);

// ============================================
// EXPENSES
// ============================================

/**
 * @swagger
 * /api/transactions/{id}/expenses:
 *   post:
 *     summary: Add expense to transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Expense added successfully
 */
router.post(
    '/:id/expenses',
    authenticateToken,
    [
        param('id').isUUID(),
        body('amount').isFloat({ min: 0.01 }),
        body('categoryId').isUUID(),
        body('description').optional().trim(),
    ],
    validate,
    async (req, res) => {
        try {
            const { amount, categoryId, description } = req.body;

            // Verify transaction ownership
            const transaction = await prisma.transaction.findFirst({
                where: {
                    id: req.params.id,
                    userId: req.user.id,
                },
            });

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            const expense = await prisma.expense.create({
                data: {
                    amount,
                    categoryId,
                    description,
                    transactionId: req.params.id,
                },
                include: {
                    category: true,
                },
            });

            res.status(201).json({
                message: 'Expense added successfully',
                expense,
            });
        } catch (error) {
            console.error('Add expense error:', error);
            res.status(500).json({ error: 'Failed to add expense' });
        }
    }
);

export default router;
