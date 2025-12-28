import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/providers:
 *   post:
 *     summary: Create a new provider
 *     tags: [Providers]
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
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               notes:
 *                 type: string
 *               organizationId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Provider created successfully
 */
router.post(
    '/',
    authenticateToken,
    [
        body('name').trim().notEmpty().withMessage('Provider name required'),
        body('email').optional().isEmail(),
        body('phone').optional().trim(),
        body('address').optional().trim(),
        body('notes').optional().trim(),
        body('organizationId').optional().isUUID(),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, email, phone, address, notes, organizationId } = req.body;

            const provider = await prisma.provider.create({
                data: {
                    name,
                    email,
                    phone,
                    address,
                    notes,
                    userId: organizationId ? null : req.user.id,
                    organizationId: organizationId || null,
                },
            });

            res.status(201).json({
                message: 'Provider created successfully',
                provider,
            });
        } catch (error) {
            console.error('Create provider error:', error);
            res.status(500).json({ error: 'Failed to create provider' });
        }
    }
);

/**
 * @swagger
 * /api/providers:
 *   get:
 *     summary: Get all providers
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of providers
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { organizationId, search } = req.query;

        const where = {
            OR: [
                { userId: req.user.id },
                organizationId ? { organizationId } : {},
            ],
        };

        if (search) {
            where.AND = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const providers = await prisma.provider.findMany({
            where,
            include: {
                _count: {
                    select: {
                        transactions: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        res.json({ providers });
    } catch (error) {
        console.error('Get providers error:', error);
        res.status(500).json({ error: 'Failed to fetch providers' });
    }
});

/**
 * @swagger
 * /api/providers/{id}:
 *   get:
 *     summary: Get provider by ID with transaction history
 *     tags: [Providers]
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
 *         description: Provider details with transactions
 *       404:
 *         description: Provider not found
 */
router.get(
    '/:id',
    authenticateToken,
    [param('id').isUUID()],
    validate,
    async (req, res) => {
        try {
            const provider = await prisma.provider.findFirst({
                where: {
                    id: req.params.id,
                    OR: [
                        { userId: req.user.id },
                        { organization: { members: { some: { userId: req.user.id } } } },
                    ],
                },
                include: {
                    transactions: {
                        orderBy: {
                            transactionDate: 'desc',
                        },
                        take: 20,
                        select: {
                            id: true,
                            contractNumber: true,
                            description: true,
                            status: true,
                            totalAmount: true,
                            transactionDate: true,
                        },
                    },
                    _count: {
                        select: {
                            transactions: true,
                        },
                    },
                },
            });

            if (!provider) {
                return res.status(404).json({ error: 'Provider not found' });
            }

            res.json({ provider });
        } catch (error) {
            console.error('Get provider error:', error);
            res.status(500).json({ error: 'Failed to fetch provider' });
        }
    }
);

/**
 * @swagger
 * /api/providers/{id}:
 *   patch:
 *     summary: Update provider
 *     tags: [Providers]
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
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Provider updated successfully
 */
router.patch(
    '/:id',
    authenticateToken,
    [
        param('id').isUUID(),
        body('name').optional().trim().notEmpty(),
        body('email').optional().isEmail(),
        body('phone').optional().trim(),
        body('address').optional().trim(),
        body('notes').optional().trim(),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, email, phone, address, notes } = req.body;

            const provider = await prisma.provider.updateMany({
                where: {
                    id: req.params.id,
                    OR: [
                        { userId: req.user.id },
                        { organization: { members: { some: { userId: req.user.id } } } },
                    ],
                },
                data: {
                    ...(name && { name }),
                    ...(email !== undefined && { email }),
                    ...(phone !== undefined && { phone }),
                    ...(address !== undefined && { address }),
                    ...(notes !== undefined && { notes }),
                },
            });

            if (provider.count === 0) {
                return res.status(404).json({ error: 'Provider not found or access denied' });
            }

            const updatedProvider = await prisma.provider.findUnique({
                where: { id: req.params.id },
            });

            res.json({
                message: 'Provider updated successfully',
                provider: updatedProvider,
            });
        } catch (error) {
            console.error('Update provider error:', error);
            res.status(500).json({ error: 'Failed to update provider' });
        }
    }
);

/**
 * @swagger
 * /api/providers/{id}:
 *   delete:
 *     summary: Delete provider
 *     tags: [Providers]
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
 *         description: Provider deleted successfully
 *       400:
 *         description: Cannot delete provider with active transactions
 */
router.delete(
    '/:id',
    authenticateToken,
    [param('id').isUUID()],
    validate,
    async (req, res) => {
        try {
            // Check for active transactions
            const transactionCount = await prisma.transaction.count({
                where: {
                    providerId: req.params.id,
                    status: 'ACTIVE',
                },
            });

            if (transactionCount > 0) {
                return res.status(400).json({
                    error: 'Cannot delete provider with active transactions',
                    activeTransactions: transactionCount,
                });
            }

            const deleted = await prisma.provider.deleteMany({
                where: {
                    id: req.params.id,
                    OR: [
                        { userId: req.user.id },
                        { organization: { members: { some: { userId: req.user.id } } } },
                    ],
                },
            });

            if (deleted.count === 0) {
                return res.status(404).json({ error: 'Provider not found or access denied' });
            }

            res.json({ message: 'Provider deleted successfully' });
        } catch (error) {
            console.error('Delete provider error:', error);
            res.status(500).json({ error: 'Failed to delete provider' });
        }
    }
);

export default router;
