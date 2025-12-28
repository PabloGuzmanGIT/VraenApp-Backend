import express from 'express';
import { PrismaClient } from '@prisma/client';
import { query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard metrics
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const { organizationId } = req.query;

        const where = organizationId
            ? { organizationId }
            : { userId: req.user.id };

        // Get metrics
        const [
            totalTransactions,
            activeTransactions,
            closedTransactions,
            totalProviders,
            totalExpenses,
            transactions,
        ] = await Promise.all([
            prisma.transaction.count({ where }),
            prisma.transaction.count({ where: { ...where, status: 'ACTIVE' } }),
            prisma.transaction.count({ where: { ...where, status: 'CLOSED' } }),
            prisma.provider.count({
                where: organizationId
                    ? { organizationId }
                    : { userId: req.user.id },
            }),
            prisma.expense.aggregate({
                where: {
                    OR: [
                        { transaction: where },
                        { transactionId: null },
                    ],
                },
                _sum: { amount: true },
            }),
            prisma.transaction.findMany({
                where,
                include: {
                    advances: true,
                    deliveries: true,
                    provider: true,
                },
            }),
        ]);

        // Calculate aggregated data
        let totalVolume = 0;
        let totalAmount = 0;
        let totalAdvances = 0;
        let totalDelivered = 0;
        const providerStats = {};

        transactions.forEach((t) => {
            totalVolume += t.quantity || 0;
            totalAmount += t.totalAmount || 0;

            const advances = t.advances.reduce((sum, a) => sum + a.amount, 0);
            const delivered = t.deliveries.reduce((sum, d) => sum + d.quantity, 0);

            totalAdvances += advances;
            totalDelivered += delivered;

            // Provider stats
            if (t.provider) {
                if (!providerStats[t.provider.id]) {
                    providerStats[t.provider.id] = {
                        id: t.provider.id,
                        name: t.provider.name,
                        transactionCount: 0,
                        totalVolume: 0,
                        totalAmount: 0,
                    };
                }
                providerStats[t.provider.id].transactionCount++;
                providerStats[t.provider.id].totalVolume += t.quantity || 0;
                providerStats[t.provider.id].totalAmount += t.totalAmount || 0;
            }
        });

        const averagePrice = totalVolume > 0 ? totalAmount / totalVolume : 0;
        const pendingBalance = totalAmount - totalAdvances;
        const pendingVolume = totalVolume - totalDelivered;

        // Top providers
        const topProviders = Object.values(providerStats)
            .sort((a, b) => b.totalVolume - a.totalVolume)
            .slice(0, 5);

        res.json({
            summary: {
                totalTransactions,
                activeTransactions,
                closedTransactions,
                totalProviders,
                totalExpenses: totalExpenses._sum.amount || 0,
            },
            financial: {
                totalAmount,
                totalAdvances,
                pendingBalance,
                averagePrice: Math.round(averagePrice * 100) / 100,
            },
            volume: {
                totalVolume,
                totalDelivered,
                pendingVolume,
            },
            topProviders,
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export data as CSV
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [transactions, providers, expenses]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: CSV data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const { type = 'transactions', startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        let csvData = '';

        if (type === 'transactions') {
            const transactions = await prisma.transaction.findMany({
                where: {
                    userId: req.user.id,
                    ...(Object.keys(dateFilter).length > 0 && {
                        transactionDate: dateFilter,
                    }),
                },
                include: {
                    provider: true,
                    productService: true,
                    advances: true,
                    deliveries: true,
                    expenses: true,
                },
            });

            // CSV Header
            csvData = 'Contract Number,Date,Provider,Product/Service,Quantity,Unit Price,Total Amount,Advances,Deliveries,Expenses,Status\n';

            // CSV Rows
            transactions.forEach((t) => {
                const totalAdvances = t.advances.reduce((sum, a) => sum + a.amount, 0);
                const totalDeliveries = t.deliveries.reduce((sum, d) => sum + d.quantity, 0);
                const totalExpenses = t.expenses.reduce((sum, e) => sum + e.amount, 0);

                csvData += `${t.contractNumber},${t.transactionDate.toISOString().split('T')[0]},${t.provider?.name || ''},${t.productService?.name || ''},${t.quantity || 0},${t.unitPrice || 0},${t.totalAmount || 0},${totalAdvances},${totalDeliveries},${totalExpenses},${t.status}\n`;
            });
        } else if (type === 'providers') {
            const providers = await prisma.provider.findMany({
                where: { userId: req.user.id },
                include: {
                    _count: {
                        select: { transactions: true },
                    },
                },
            });

            csvData = 'Name,Email,Phone,Address,Transaction Count\n';
            providers.forEach((p) => {
                csvData += `${p.name},${p.email || ''},${p.phone || ''},${p.address || ''},${p._count.transactions}\n`;
            });
        } else if (type === 'expenses') {
            const expenses = await prisma.expense.findMany({
                where: {
                    OR: [
                        { transaction: { userId: req.user.id } },
                        { transactionId: null },
                    ],
                    ...(Object.keys(dateFilter).length > 0 && {
                        expenseDate: dateFilter,
                    }),
                },
                include: {
                    category: true,
                    transaction: true,
                },
            });

            csvData = 'Date,Category,Amount,Description,Transaction\n';
            expenses.forEach((e) => {
                csvData += `${e.expenseDate.toISOString().split('T')[0]},${e.category.name},${e.amount},${e.description || ''},${e.transaction?.contractNumber || 'General'}\n`;
            });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvData);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

export default router;
