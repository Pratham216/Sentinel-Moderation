import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function loadUser(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.nebulaUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    globalRole: user.globalRole,
  };
  next();
}

export function requireGlobalAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.nebulaUser?.globalRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
