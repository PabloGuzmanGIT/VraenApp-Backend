import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to verify JWT token
 */
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                language: true,
                theme: true,
            },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Invalid token' });
        }
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * Middleware to check if user has access to organization
 */
export const checkOrganizationAccess = async (req, res, next) => {
    try {
        const organizationId = req.params.organizationId || req.body.organizationId;

        if (!organizationId) {
            return next(); // No organization specified, continue
        }

        const membership = await prisma.organizationMember.findFirst({
            where: {
                userId: req.user.id,
                organizationId: organizationId,
            },
        });

        if (!membership) {
            // Check if user is the creator
            const organization = await prisma.organization.findFirst({
                where: {
                    id: organizationId,
                    createdById: req.user.id,
                },
            });

            if (!organization) {
                return res.status(403).json({ error: 'Access denied to this organization' });
            }
        }

        req.organizationMembership = membership;
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Failed to verify organization access' });
    }
};

/**
 * Middleware to check if user is admin of organization
 */
export const requireOrganizationAdmin = async (req, res, next) => {
    if (!req.organizationMembership) {
        return res.status(403).json({ error: 'Organization membership required' });
    }

    if (req.organizationMembership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Organization admin access required' });
    }

    next();
};
