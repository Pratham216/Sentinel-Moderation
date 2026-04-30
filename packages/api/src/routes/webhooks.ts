import { Router, raw } from 'express';
import crypto from 'crypto';
import { PostStatus, CommunityRole } from '@prisma/client';
import { webhookIngestSchema } from '@nebula/shared';
import { prisma } from '../lib/prisma.js';
import { scheduleModeration } from '../pipeline/moderate.js';
import { emitToCommunity } from '../realtime/socket.js';
import { logger } from '../lib/logger.js';

export const webhooksRouter = Router();

webhooksRouter.post(
  '/:communityId/ingest',
  raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const community = await prisma.community.findUnique({
        where: { id: req.params.communityId },
      });
      if (!community) return res.status(404).json({ error: 'Community not found' });

      const signature = req.headers['x-signature'] as string | undefined;
      const rawBody = req.body as Buffer;
      const expected = crypto
        .createHmac('sha256', community.webhookSecret)
        .update(rawBody)
        .digest('hex');
      if (!signature || signature !== expected) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const json = JSON.parse(rawBody.toString('utf8'));
      const body = webhookIngestSchema.parse(json);

      let user = await prisma.user.findUnique({ where: { email: body.author.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: body.author.email,
            name: body.author.name || body.author.email.split('@')[0],
          },
        });
      }

      await prisma.communityMember.upsert({
        where: {
          userId_communityId: { userId: user.id, communityId: community.id },
        },
        create: {
          userId: user.id,
          communityId: community.id,
          role: CommunityRole.USER,
        },
        update: {},
      });

      const post = await prisma.post.create({
        data: {
          communityId: community.id,
          authorId: user.id,
          externalSource: 'webhook',
          externalId: body.externalId,
          text: body.text,
          mediaUrls: body.mediaUrls ?? [],
          status: PostStatus.PENDING,
        },
      });

      emitToCommunity(community.id, 'post:new', { postId: post.id });
      scheduleModeration(post.id);

      res.status(201).json({ postId: post.id });
    } catch (e) {
      logger.error(e);
      next(e);
    }
  }
);
