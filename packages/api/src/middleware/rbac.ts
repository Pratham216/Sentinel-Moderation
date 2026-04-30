import type { Response, NextFunction, Request } from 'express';
import { CommunityRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const order: Record<CommunityRole, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
};

export function requireCommunityRole(minRole: CommunityRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const communityId = String(req.params.communityId ?? req.params.id ?? '');
    if (!req.userId || !communityId) {
      return res.status(400).json({ error: 'Bad request' });
    }
    const member = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: req.userId, communityId } },
    });
    if (!member) {
      return res.status(403).json({ error: 'Not a community member' });
    }
    if (order[member.role] < order[minRole]) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    (req as Request & { communityRole: CommunityRole }).communityRole = member.role;
    next();
  };
}
