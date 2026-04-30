import type { Request, Response, NextFunction } from 'express';

const hits = new Map<string, { count: number; reset: number }>();

export function simpleRateLimit(max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const cur = hits.get(key);
    if (!cur || now > cur.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (cur.count >= max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    cur.count += 1;
    return next();
  };
}
