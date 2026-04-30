import passport from 'passport';
import { prisma } from './lib/prisma.js';
import type { User as DbUser } from '@prisma/client';

passport.serializeUser((user: unknown, done) => {
  done(null, (user as DbUser).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (e) {
    done(e);
  }
});
