import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { authenticateToken, requireAdmin, checkOrganizationAccess, requireOrganizationAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/',
    authenticateToken,
    [
        body('name').trim().notEmpty().withMessage('Organization name required'),
        body('description').optional().trim(),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, description } = req.body;

            const organization = await prisma.organization.create({
                data: {
                    name,
                    description,
                    createdById: req.user.id,
                    members: {
                        create: {
                            userId: req.user.id,
                            role: 'ADMIN',
                        },
                    },
                },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });

            res.status(201).json({
                message: 'Organization created successfully',
                organization,
            });
        } catch (error) {
            console.error('Create organization error:', error);
            res.status(500).json({ error: 'Failed to create organization' });
        }
    }
);

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get user's organizations
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const organizations = await prisma.organization.findMany({
            where: {
                OR: [
                    { createdById: req.user.id },
                    { members: { some: { userId: req.user.id } } },
                ],
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        transactions: true,
                        providers: true,
                    },
                },
            },
        });

        res.json({ organizations });
    } catch (error) {
        console.error('Get organizations error:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Organizations]
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
 *         description: Organization details
 *       403:
 *         description: Access denied
 *       404:
 *         description: Organization not found
 */
router.get(
    '/:id',
    authenticateToken,
    [param('id').isUUID().withMessage('Valid organization ID required')],
    validate,
    checkOrganizationAccess,
    async (req, res) => {
        try {
            const organization = await prisma.organization.findUnique({
                where: { id: req.params.id },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                    role: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            transactions: true,
                            providers: true,
                        },
                    },
                },
            });

            if (!organization) {
                return res.status(404).json({ error: 'Organization not found' });
            }

            res.json({ organization });
        } catch (error) {
            console.error('Get organization error:', error);
            res.status(500).json({ error: 'Failed to fetch organization' });
        }
    }
);

/**
 * @swagger
 * /api/organizations/{id}/members:
 *   post:
 *     summary: Add member to organization
 *     tags: [Organizations]
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
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [ADMIN, OPERATOR]
 *     responses:
 *       201:
 *         description: Member added successfully
 */
router.post(
    '/:id/members',
    authenticateToken,
    [
        param('id').isUUID().withMessage('Valid organization ID required'),
        body('email').isEmail().withMessage('Valid email required'),
        body('role').optional().isIn(['ADMIN', 'OPERATOR']),
    ],
    validate,
    checkOrganizationAccess,
    requireOrganizationAdmin,
    async (req, res) => {
        try {
            const { email, role = 'OPERATOR' } = req.body;

            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email },
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Check if already member
            const existingMember = await prisma.organizationMember.findUnique({
                where: {
                    userId_organizationId: {
                        userId: user.id,
                        organizationId: req.params.id,
                    },
                },
            });

            if (existingMember) {
                return res.status(409).json({ error: 'User is already a member' });
            }

            // Add member
            const member = await prisma.organizationMember.create({
                data: {
                    userId: user.id,
                    organizationId: req.params.id,
                    role,
                },
                include: {
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
                message: 'Member added successfully',
                member,
            });
        } catch (error) {
            console.error('Add member error:', error);
            res.status(500).json({ error: 'Failed to add member' });
        }
    }
);

/**
 * @swagger
 * /api/organizations/{id}/members/{userId}:
 *   patch:
 *     summary: Update member role
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, OPERATOR]
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.patch(
    '/:id/members/:userId',
    authenticateToken,
    [
        param('id').isUUID(),
        param('userId').isUUID(),
        body('role').isIn(['ADMIN', 'OPERATOR']),
    ],
    validate,
    checkOrganizationAccess,
    requireOrganizationAdmin,
    async (req, res) => {
        try {
            const { role } = req.body;

            const member = await prisma.organizationMember.update({
                where: {
                    userId_organizationId: {
                        userId: req.params.userId,
                        organizationId: req.params.id,
                    },
                },
                data: { role },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            });

            res.json({
                message: 'Role updated successfully',
                member,
            });
        } catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({ error: 'Failed to update role' });
        }
    }
);

/**
 * @swagger
 * /api/organizations/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete(
    '/:id/members/:userId',
    authenticateToken,
    [param('id').isUUID(), param('userId').isUUID()],
    validate,
    checkOrganizationAccess,
    requireOrganizationAdmin,
    async (req, res) => {
        try {
            await prisma.organizationMember.delete({
                where: {
                    userId_organizationId: {
                        userId: req.params.userId,
                        organizationId: req.params.id,
                    },
                },
            });

            res.json({ message: 'Member removed successfully' });
        } catch (error) {
            console.error('Remove member error:', error);
            res.status(500).json({ error: 'Failed to remove member' });
        }
    }
);

export default router;
