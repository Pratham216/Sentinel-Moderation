import { Router, type Request } from 'express';
import type { Prisma } from '@prisma/client';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const auditRouter = Router();

auditRouter.get('/', requireAuth, loadUser, async (req: Request, res, next) => {
  try {
    const communityId =
      typeof req.query.communityId === 'string' ? req.query.communityId : undefined;
    const actorId = typeof req.query.actorId === 'string' ? req.query.actorId : undefined;

    let where: Prisma.AuditLogWhereInput = actorId ? { actorId } : {};

    if (communityId) {
      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: { userId: req.userId!, communityId },
        },
      });
      if (!membership) return res.status(403).json({ error: 'Forbidden' });

      const posts = await prisma.post.findMany({
        where: { communityId },
        select: { id: true },
      });
      const postIds = posts.map((p) => p.id);
      where = {
        AND: [
          ...(actorId ? [{ actorId }] : []),
          {
            OR: [
              { entityType: 'Community', entityId: communityId },
              ...(postIds.length ? [{ entityType: 'Post' as const, entityId: { in: postIds } }] : []),
            ],
          },
        ],
      };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ logs });
  } catch (e) {
    next(e);
  }
});
