import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from './lib/prisma.js';
import { env } from './config/env.js';

export function registerOAuthStrategies() {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${env.OAUTH_CALLBACK_BASE}/auth/oauth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email'));
            let user = await prisma.user.findFirst({
              where: {
                OR: [{ email }, { oauthProvider: 'google', oauthId: profile.id }],
              },
            });
            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName || email,
                  oauthProvider: 'google',
                  oauthId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                },
              });
            } else if (!user.oauthId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  oauthProvider: 'google',
                  oauthId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                },
              });
            }
            return done(null, user);
          } catch (e) {
            return done(e as Error);
          }
        }
      )
    );
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          callbackURL: `${env.OAUTH_CALLBACK_BASE}/auth/oauth/github/callback`,
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: {
            id: string;
            emails?: { value: string }[];
            displayName?: string;
            username?: string;
            photos?: { value: string }[];
          },
          done: (err: Error | null, user?: Express.User | false) => void
        ) => {
          try {
            const email =
              profile.emails?.[0]?.value ||
              `${profile.username || profile.id}@users.noreply.github.com`;
            let user = await prisma.user.findFirst({
              where: {
                OR: [{ email }, { oauthProvider: 'github', oauthId: profile.id }],
              },
            });
            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName || profile.username || email,
                  oauthProvider: 'github',
                  oauthId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                },
              });
            } else if (!user.oauthId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  oauthProvider: 'github',
                  oauthId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                },
              });
            }
            return done(null, user);
          } catch (e) {
            return done(e as Error);
          }
        }
      )
    );
  }
}
