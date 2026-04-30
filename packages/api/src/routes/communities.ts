import { Router, type Request } from 'express';
import { z } from 'zod';
import { CommunityRole } from '@prisma/client';
import {
  createCommunitySchema,
  communityRuleSchema,
  communitySettingsSchema,
} from '@nebula/shared';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { requireCommunityRole } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

export const communitiesRouter = Router();

communitiesRouter.get('/', requireAuth, loadUser, async (req: Request, res, next) => {
  try {
    let memberships = await prisma.communityMember.findMany({
      where: { userId: req.userId },
      include: {
        community: true,
      },
    });

    // If user has no communities, auto-join them to the "main" one
    if (memberships.length === 0) {
      const mainCommunity = await prisma.community.findFirst({
        where: { slug: 'main' }
      });

      if (mainCommunity) {
        const newMember = await prisma.communityMember.create({
          data: {
            userId: req.userId!,
            communityId: mainCommunity.id,
            role: CommunityRole.USER
          },
          include: {
            community: true
          }
        });
        memberships = [newMember];
      }
    }

    res.json({
      communities: memberships.map((m) => ({
        ...m.community,
        role: m.role,
      })),
    });
  } catch (e) {
    next(e);
  }
});

communitiesRouter.post('/', requireAuth, loadUser, async (req: Request, res, next) => {
  try {
    const body = createCommunitySchema.parse(req.body);
    const slugTaken = await prisma.community.findUnique({ where: { slug: body.slug } });
    if (slugTaken) return res.status(409).json({ error: 'Slug taken' });

    const community = await prisma.community.create({
      data: {
        slug: body.slug,
        name: body.name,
        description: body.description ?? '',
        ownerId: req.userId!,
        webhookSecret: crypto.randomBytes(32).toString('hex'),
        settings: {
          autoApproveBelow: 0.25,
          autoRejectAbove: 0.85,
        },
        rules: [],
      },
    });

    await prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: req.userId!,
        role: CommunityRole.ADMIN,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.userId!,
        action: 'COMMUNITY_CREATED',
        entityType: 'Community',
        entityId: community.id,
      },
    });

    res.status(201).json({ community });
  } catch (e) {
    next(e);
  }
});

communitiesRouter.get(
  '/:communityId/members',
  requireAuth,
  loadUser,
  async (req: Request, res, next) => {
    try {
      const cid = String(req.params.communityId);
      const m = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: { userId: req.userId!, communityId: cid },
        },
      });
      if (!m) return res.status(403).json({ error: 'Forbidden' });
      const members = await prisma.communityMember.findMany({
        where: { communityId: cid },
        include: {
          user: { select: { id: true, name: true, email: true, trustScore: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: 'asc' },
      });
      res.json({ members });
    } catch (e) {
      next(e);
    }
  }
);

communitiesRouter.get('/:communityId', requireAuth, loadUser, async (req: Request, res, next) => {
  try {
    const cid = String(req.params.communityId);
    const m = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: { userId: req.userId!, communityId: cid },
      },
      include: { community: true },
    });
    if (!m) return res.status(403).json({ error: 'Forbidden' });
    const pub = { ...m.community } as Record<string, unknown>;
    if (m.role !== CommunityRole.ADMIN) delete pub.webhookSecret;
    res.json({ community: pub, role: m.role });
  } catch (e) {
    next(e);
  }
});

communitiesRouter.patch(
  '/:communityId',
  requireAuth,
  loadUser,
  requireCommunityRole(CommunityRole.ADMIN),
  async (req: Request, res, next) => {
    try {
      const cid = String(req.params.communityId);
      const { name, description } = req.body as { name?: string; description?: string };
      const community = await prisma.community.update({
        where: { id: cid },
        data: {
          ...(name != null ? { name } : {}),
          ...(description != null ? { description } : {}),
        },
      });
      res.json({ community });
    } catch (e) {
      next(e);
    }
  }
);

communitiesRouter.put(
  '/:communityId/rules',
  requireAuth,
  loadUser,
  requireCommunityRole(CommunityRole.MODERATOR),
  async (req: Request, res, next) => {
    try {
      const cid = String(req.params.communityId);
      const { rules } = z.object({ rules: z.array(communityRuleSchema) }).parse(req.body);
      const community = await prisma.community.update({
        where: { id: cid },
        data: { rules: rules as object },
      });
      res.json({ community });
    } catch (e) {
      next(e);
    }
  }
);

communitiesRouter.put(
  '/:communityId/settings',
  requireAuth,
  loadUser,
  requireCommunityRole(CommunityRole.ADMIN),
  async (req: Request, res, next) => {
    try {
      const cid = String(req.params.communityId);
      const settings = communitySettingsSchema.parse(req.body);
      const cur = await prisma.community.findUnique({
        where: { id: cid },
      });
      const merged = { ...(cur?.settings as object), ...settings };
      const community = await prisma.community.update({
        where: { id: cid },
        data: { settings: merged },
      });
      res.json({ community });
    } catch (e) {
      next(e);
    }
  }
);

communitiesRouter.post(
  '/:communityId/members',
  requireAuth,
  loadUser,
  requireCommunityRole(CommunityRole.ADMIN),
  async (req: Request, res, next) => {
    try {
      const cid = String(req.params.communityId);
      const { email, role } = req.body as { email: string; role: CommunityRole };
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const m = await prisma.communityMember.upsert({
        where: {
          userId_communityId: { userId: user.id, communityId: cid },
        },
        create: {
          userId: user.id,
          communityId: cid,
          role: role || CommunityRole.USER,
        },
        update: { role: role || CommunityRole.USER },
      });
      res.json({ member: m });
    } catch (e) {
      next(e);
    }
  }
);

communitiesRouter.patch(
  '/:communityId/members/:userId',
  requireAuth,
  loadUser,
  requireCommunityRole(CommunityRole.ADMIN),
  async (req: Request, res, next) => {
    try {
      const cid = String(req.params.communityId);
      const uid = String(req.params.userId);
      const role = req.body.role as CommunityRole;
      const m = await prisma.communityMember.update({
        where: {
          userId_communityId: {
            userId: uid,
            communityId: cid,
          },
        },
        data: { role },
      });
      res.json({ member: m });
    } catch (e) {
      next(e);
    }
  }
);
