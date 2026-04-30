import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessPayload {
  sub: string;
  email: string;
  globalRole: string;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessPayload;
}

export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  const p = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; jti: string; type?: string };
  if (p.type !== 'refresh') throw new Error('Invalid token type');
  return { sub: p.sub, jti: p.jti };
}
