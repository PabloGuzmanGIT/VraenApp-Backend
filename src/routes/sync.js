import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/sync/push:
 *   post:
 *     summary: Push local changes to server (manual sync)
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactions:
 *                 type: array
 *                 items:
 *                   type: object
 *               providers:
 *                 type: array
 *                 items:
 *                   type: object
 *               expenses:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Data synchronized successfully
 */
router.post(
    '/push',
    authenticateToken,
    [
        body('transactions').optional().isArray(),
        body('providers').optional().isArray(),
        body('expenses').optional().isArray(),
    ],
    validate,
    async (req, res) => {
        try {
            const { transactions = [], providers = [], expenses = [] } = req.body;
            const results = {
                transactions: { created: 0, updated: 0, errors: [] },
                providers: { created: 0, updated: 0, errors: [] },
                expenses: { created: 0, updated: 0, errors: [] },
            };

            // Sync Providers
            for (const provider of providers) {
                try {
                    const existing = await prisma.provider.findFirst({
                        where: {
                            id: provider.id,
                            userId: req.user.id,
                        },
                    });

                    if (existing) {
                        // Update if server version is older
                        if (new Date(provider.updatedAt) > new Date(existing.updatedAt)) {
                            await prisma.provider.update({
                                where: { id: provider.id },
                                data: {
                                    name: provider.name,
                                    email: provider.email,
                                    phone: provider.phone,
                                    address: provider.address,
                                    notes: provider.notes,
                                    updatedAt: new Date(provider.updatedAt),
                                },
                            });
                            results.providers.updated++;
                        }
                    } else {
                        // Create new
                        await prisma.provider.create({
                            data: {
                                id: provider.id,
                                name: provider.name,
                                email: provider.email,
                                phone: provider.phone,
                                address: provider.address,
                                notes: provider.notes,
                                userId: req.user.id,
                                createdAt: new Date(provider.createdAt),
                                updatedAt: new Date(provider.updatedAt),
                            },
                        });
                        results.providers.created++;
                    }
                } catch (error) {
                    results.providers.errors.push({
                        id: provider.id,
                        error: error.message,
                    });
                }
            }

            // Sync Transactions
            for (const transaction of transactions) {
                try {
                    const existing = await prisma.transaction.findFirst({
                        where: {
                            id: transaction.id,
                            userId: req.user.id,
                        },
                    });

                    if (existing) {
                        // Last-write-wins: update if client version is newer
                        if (new Date(transaction.updatedAt) > new Date(existing.updatedAt)) {
                            await prisma.transaction.update({
                                where: { id: transaction.id },
                                data: {
                                    description: transaction.description,
                                    quantity: transaction.quantity,
                                    unitPrice: transaction.unitPrice,
                                    totalAmount: transaction.totalAmount,
                                    status: transaction.status,
                                    updatedAt: new Date(transaction.updatedAt),
                                },
                            });
                            results.transactions.updated++;
                        }
                    } else {
                        // Create new transaction
                        await prisma.transaction.create({
                            data: {
                                id: transaction.id,
                                contractNumber: transaction.contractNumber,
                                description: transaction.description,
                                quantity: transaction.quantity,
                                unitPrice: transaction.unitPrice,
                                totalAmount: transaction.totalAmount,
                                status: transaction.status,
                                userId: req.user.id,
                                providerId: transaction.providerId,
                                productServiceId: transaction.productServiceId,
                                transactionDate: new Date(transaction.transactionDate),
                                createdAt: new Date(transaction.createdAt),
                                updatedAt: new Date(transaction.updatedAt),
                            },
                        });
                        results.transactions.created++;
                    }
                } catch (error) {
                    results.transactions.errors.push({
                        id: transaction.id,
                        error: error.message,
                    });
                }
            }

            // Log sync
            await prisma.syncLog.create({
                data: {
                    userId: req.user.id,
                    syncType: 'push',
                    recordsCount: transactions.length + providers.length + expenses.length,
                    status: 'success',
                },
            });

            res.json({
                message: 'Sync completed',
                results,
            });
        } catch (error) {
            console.error('Sync push error:', error);

            // Log failed sync
            await prisma.syncLog.create({
                data: {
                    userId: req.user.id,
                    syncType: 'push',
                    recordsCount: 0,
                    status: 'failed',
                    errorMessage: error.message,
                },
            });

            res.status(500).json({ error: 'Sync failed' });
        }
    }
);

/**
 * @swagger
 * /api/sync/pull:
 *   get:
 *     summary: Pull server changes to local (manual sync)
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lastSync
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO timestamp of last successful sync
 *     responses:
 *       200:
 *         description: Server data retrieved successfully
 */
router.get('/pull', authenticateToken, async (req, res) => {
    try {
        const { lastSync } = req.query;
        const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

        // Get all data updated since last sync
        const [transactions, providers, expenses, categories] = await Promise.all([
            prisma.transaction.findMany({
                where: {
                    userId: req.user.id,
                    updatedAt: { gt: lastSyncDate },
                },
                include: {
                    advances: true,
                    deliveries: true,
                    expenses: {
                        include: {
                            category: true,
                        },
                    },
                },
            }),
            prisma.provider.findMany({
                where: {
                    userId: req.user.id,
                    updatedAt: { gt: lastSyncDate },
                },
            }),
            prisma.expense.findMany({
                where: {
                    transactionId: null, // General expenses only
                    updatedAt: { gt: lastSyncDate },
                },
                include: {
                    category: true,
                },
            }),
            prisma.expenseCategory.findMany({
                where: {
                    OR: [
                        { isDefault: true },
                        { userId: req.user.id },
                    ],
                },
            }),
        ]);

        // Log sync
        await prisma.syncLog.create({
            data: {
                userId: req.user.id,
                syncType: 'pull',
                recordsCount: transactions.length + providers.length + expenses.length,
                status: 'success',
            },
        });

        res.json({
            data: {
                transactions,
                providers,
                expenses,
                categories,
            },
            syncTimestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Sync pull error:', error);

        await prisma.syncLog.create({
            data: {
                userId: req.user.id,
                syncType: 'pull',
                recordsCount: 0,
                status: 'failed',
                errorMessage: error.message,
            },
        });

        res.status(500).json({ error: 'Sync failed' });
    }
});

/**
 * @swagger
 * /api/sync/status:
 *   get:
 *     summary: Get sync history
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync history
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const syncLogs = await prisma.syncLog.findMany({
            where: {
                userId: req.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 20,
        });

        const lastSuccessfulSync = syncLogs.find(log => log.status === 'success');

        res.json({
            lastSync: lastSuccessfulSync?.createdAt,
            history: syncLogs,
        });
    } catch (error) {
        console.error('Get sync status error:', error);
        res.status(500).json({ error: 'Failed to fetch sync status' });
    }
});

export default router;
