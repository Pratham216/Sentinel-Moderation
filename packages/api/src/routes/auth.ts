import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import passport from 'passport';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { env } from '../config/env.js';
import { registerSchema, loginSchema } from '@nebula/shared';
import { ZodError } from 'zod';

export const authRouter = Router();

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function hashToken(t: string) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

async function issueTokens(userId: string, email: string, globalRole: string, res: import('express').Response) {
  const accessToken = signAccessToken({
    sub: userId,
    email,
    globalRole,
  });
  const jti = crypto.randomUUID();
  const refreshRaw = signRefreshToken(userId, jti);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshRaw),
      expiresAt,
    },
  });
  res.cookie(REFRESH_COOKIE, refreshRaw, COOKIE_OPTS);
  return accessToken;
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        globalRole: body.globalRole || 'USER',
      },
    });
    const accessToken = await issueTokens(user.id, user.email, user.globalRole, res);
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
      },
    });
  } catch (e) {
    if (e instanceof ZodError) return res.status(400).json({ error: e.flatten() });
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user?.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    const accessToken = await issueTokens(user.id, user.email, user.globalRole, res);
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
      },
    });
  } catch (e) {
    if (e instanceof ZodError) return res.status(400).json({ error: e.flatten() });
    next(e);
  }
});

authRouter.post('/logout', async (req, res) => {
  const refresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (refresh) {
    try {
      const { sub, jti } = verifyRefreshToken(refresh);
      await prisma.refreshToken.deleteMany({
        where: {
          userId: sub,
          tokenHash: hashToken(refresh),
        },
      });
    } catch {
      /* ignore */
    }
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.json({ ok: true });
});

authRouter.post('/refresh', async (req, res) => {
  const refresh = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!refresh) return res.status(401).json({ error: 'No refresh token' });
  try {
    const { sub } = verifyRefreshToken(refresh);
    const stored = await prisma.refreshToken.findFirst({
      where: {
        userId: sub,
        tokenHash: hashToken(refresh),
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) return res.status(401).json({ error: 'Invalid refresh' });

    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) return res.status(401).json({ error: 'Invalid user' });

    await prisma.refreshToken.deleteMany({ where: { id: stored.id } });

    const accessToken = await issueTokens(user.id, user.email, user.globalRole, res);
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

authRouter.get('/me', requireAuth, loadUser, (req, res) => {
  res.json({ user: req.nebulaUser });
});

authRouter.patch('/update-me', requireAuth, async (req, res, next) => {
  try {
    const { name, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { 
        name: name || undefined,
        avatarUrl: avatarUrl || undefined
      }
    });
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/update-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.passwordHash) return res.status(401).json({ error: 'Auth failed' });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Incorrect current password' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash }
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* OAuth (strategies registered in oauth-strategies.ts) */
authRouter.get('/oauth/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

authRouter.get(
  '/oauth/google/callback',
  passport.authenticate('google', { failureRedirect: `${env.WEB_ORIGIN}/login?error=oauth` }),
  async (req, res) => {
    const u = req.user as { id: string; email: string; globalRole: string };
    const accessToken = await issueTokens(u.id, u.email, u.globalRole, res);
    res.redirect(`${env.WEB_ORIGIN}/oauth/callback?token=${encodeURIComponent(accessToken)}`);
  }
);

authRouter.get('/oauth/github', (req, res, next) => {
  if (!env.GITHUB_CLIENT_ID) {
    return res.status(501).json({ error: 'GitHub OAuth not configured' });
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

authRouter.get(
  '/oauth/github/callback',
  passport.authenticate('github', { failureRedirect: `${env.WEB_ORIGIN}/login?error=oauth` }),
  async (req, res) => {
    const u = req.user as { id: string; email: string; globalRole: string };
    const accessToken = await issueTokens(u.id, u.email, u.globalRole, res);
    res.redirect(`${env.WEB_ORIGIN}/oauth/callback?token=${encodeURIComponent(accessToken)}`);
  }
);
