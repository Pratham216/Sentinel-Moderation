import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { env, allowedOrigins } from '../config/env.js';
import { logger } from '../lib/logger.js';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('Unauthorized'));
      }
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return next(new Error('Unauthorized'));
      (socket as Socket & { userId: string }).userId = user.id;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as Socket & { userId: string }).userId;
    logger.debug({ userId }, 'socket connected');

    socket.on('join:community', async (communityId: string) => {
      const m = await prisma.communityMember.findUnique({
        where: { userId_communityId: { userId, communityId } },
      });
      if (m) {
        socket.join(`community:${communityId}`);
        logger.debug({ userId, communityId }, 'joined room');
      }
    });

    socket.on('leave:community', (communityId: string) => {
      socket.leave(`community:${communityId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToCommunity(communityId: string, event: string, payload: unknown) {
  try {
    getIO().to(`community:${communityId}`).emit(event, payload);
  } catch {
    /* not initialized in tests */
  }
}
