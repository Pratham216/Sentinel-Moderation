import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { createServer } from 'http';
import { env, allowedOrigins } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { initSocket } from './realtime/socket.js';
import { logger } from './lib/logger.js';
import './passport-setup.js';
import { registerOAuthStrategies } from './oauth-strategies.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { communitiesRouter } from './routes/communities.js';
import { postsRouter } from './routes/posts.js';
import { webhooksRouter } from './routes/webhooks.js';
import { analyticsRouter } from './routes/analytics.js';
import { trustRouter } from './routes/trust.js';
import { auditRouter } from './routes/audit.js';

registerOAuthStrategies();

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use('/webhooks', webhooksRouter);
app.use(express.json({ limit: '4mb' }));
app.use(
  session({
    secret: env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(healthRouter);
app.use('/auth', authRouter);
app.use('/communities', communitiesRouter);
app.use('/', postsRouter);
app.use('/', analyticsRouter);
app.use('/', trustRouter);
app.use('/audit', auditRouter);

app.use(errorHandler);

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});
