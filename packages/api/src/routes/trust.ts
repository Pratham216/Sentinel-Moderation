import { Router, type Request } from 'express';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const trustRouter = Router();

trustRouter.get(
  '/communities/:communityId/trust',
  requireAuth,
  loadUser,
  async (req: Request, res, next) => {
    try {
      const cid = String(req.params.communityId);
      const m = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: { userId: req.userId!, communityId: cid },
        },
      });
      if (!m) return res.status(403).json({ error: 'Forbidden' });

      const members = await prisma.communityMember.findMany({
        where: { communityId: cid },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              trustScore: true,
            },
          },
        },
      });

      const sorted = [...members].sort((a, b) => b.user.trustScore - a.user.trustScore);

      const events = await prisma.trustEvent.findMany({
        where: {
          userId: { in: members.map((x) => x.userId) },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      res.json({
        leaderboard: sorted.map((x) => ({
          user: x.user,
          role: x.role,
        })),
        recentEvents: events,
      });
    } catch (e) {
      next(e);
    }
  }
);
