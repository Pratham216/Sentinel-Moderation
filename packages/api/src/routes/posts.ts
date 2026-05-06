import { Router, type Request } from 'express';
import { PostStatus, CommunityRole, ModerationActionType } from '@prisma/client';
import { createPostSchema, postActionSchema } from '@nebula/shared';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { scheduleModeration, reanalyzePost, moderatorAction } from '../pipeline/moderate.js';
import { emitToCommunity } from '../realtime/socket.js';
import { ZodError } from 'zod';

export const postsRouter = Router();

postsRouter.get(
  '/communities/:communityId/posts',
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

      const status = req.query.status as PostStatus | undefined;
      const authorId = req.query.authorId as string | undefined;
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 10;

      const where: any = {
        communityId: cid,
        ...(authorId ? { authorId } : {}),
      };

      // Only apply status filter if it's not 'all'
      if (status && (status as string) !== 'all') {
        where.status = status;
      } else if (!status) {
        // Default to APPROVED for public feeds
        where.status = PostStatus.APPROVED;
      }

      const [posts, totalCount] = await Promise.all([
        prisma.post.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, email: true, trustScore: true, avatarUrl: true } },
            moderationResult: true,
            _count: {
              select: {
                likes: true,
                comments: true,
                savedBy: true,
              },
            },
            likes: {
              where: { userId: req.userId! },
              select: { userId: true },
            },
            savedBy: {
              where: { userId: req.userId! },
              select: { userId: true },
            },
          },
        }),
        prisma.post.count({ where })
      ]);

      let nextCursor: string | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      const postsWithState = posts.map(p => ({
        ...p,
        isLiked: p.likes.length > 0,
        isSaved: p.savedBy.length > 0,
      }));

      res.json({ posts: postsWithState, nextCursor, totalCount });
    } catch (e) {
      next(e);
    }
  }
);

postsRouter.get('/posts/saved', requireAuth, async (req: Request, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;

    const saved = await prisma.savedPost.findMany({
      where: { userId: req.userId! },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, email: true, trustScore: true, avatarUrl: true } },
            _count: { select: { likes: true, comments: true } },
            likes: { where: { userId: req.userId! }, select: { userId: true } },
            savedBy: { where: { userId: req.userId! }, select: { userId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | undefined = undefined;
    if (saved.length > limit) {
      const nextItem = saved.pop();
      nextCursor = nextItem!.id;
    }

    const posts = saved.map(s => ({
      ...s.post,
      isLiked: s.post.likes.length > 0,
      isSaved: s.post.savedBy.length > 0,
    }));

    res.json({ posts, nextCursor });
  } catch (e) {
    next(e);
  }
});

postsRouter.post('/posts/:postId/save', requireAuth, async (req: Request, res, next) => {
  try {
    const pid = String(req.params.postId);
    const userId = req.userId!;

    const existing = await prisma.savedPost.findUnique({
      where: { userId_postId: { userId, postId: pid } },
    });

    if (existing) {
      await prisma.savedPost.delete({ where: { id: existing.id } }).catch(() => { });
      res.json({ saved: false });
    } else {
      await prisma.savedPost.create({
        data: { userId, postId: pid },
      }).catch(() => { });
      const post = await prisma.post.findUnique({ where: { id: pid } });
      if (post) emitToCommunity(post.communityId, 'post:updated', { postId: pid });
      res.json({ saved: true });
    }
  } catch (e) {
    next(e);
  }
});

postsRouter.post('/posts/:postId/like', requireAuth, async (req: Request, res, next) => {
  try {
    const pid = String(req.params.postId);
    const userId = req.userId!;

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId: pid } },
    });

    if (existing) {
      await prisma.like.delete({
        where: { id: existing.id },
      }).catch(() => { }); // Ignore if already deleted
      res.json({ liked: false });
    } else {
      await prisma.like.create({
        data: { userId, postId: pid },
      }).catch(() => { });
      const post = await prisma.post.findUnique({ where: { id: pid } });
      if (post) emitToCommunity(post.communityId, 'post:updated', { postId: pid });
      res.json({ liked: true });
    }
  } catch (e) {
    next(e);
  }
});

postsRouter.post('/posts/:postId/comment', requireAuth, async (req: Request, res, next) => {
  try {
    const pid = String(req.params.postId);
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const comment = await prisma.comment.create({
      data: {
        userId: req.userId!,
        postId: pid,
        text,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
    const post = await prisma.post.findUnique({ where: { id: pid } });
    if (post) emitToCommunity(post.communityId, 'post:updated', { postId: pid });
    res.status(201).json({ comment });
  } catch (e) {
    next(e);
  }
});

postsRouter.get('/posts/:postId/comments', requireAuth, async (req: Request, res, next) => {
  try {
    const pid = String(req.params.postId);
    const comments = await prisma.comment.findMany({
      where: { postId: pid },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ comments });
  } catch (e) {
    next(e);
  }
});

postsRouter.post(
  '/communities/:communityId/posts',
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

      const body = createPostSchema.parse(req.body);
      const post = await prisma.post.create({
        data: {
          communityId: cid,
          authorId: req.userId!,
          text: body.text,
          mediaUrls: body.mediaUrls ?? [],
          status: PostStatus.PENDING,
        },
      });

      emitToCommunity(cid, 'post:new', { postId: post.id });
      scheduleModeration(post.id);

      res.status(201).json({ post });
    } catch (e) {
      if (e instanceof ZodError) return res.status(400).json({ error: e.flatten() });
      next(e);
    }
  }
);

postsRouter.get('/posts/:postId', requireAuth, loadUser, async (req: Request, res, next) => {
  try {
    const pid = String(req.params.postId);
    const post = await prisma.post.findUnique({
      where: { id: pid },
      include: {
        author: { select: { id: true, name: true, email: true, trustScore: true, avatarUrl: true } },
        moderationResult: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            savedBy: true,
          },
        },
        actions: {
          include: { moderator: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        community: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!post) return res.status(404).json({ error: 'Not found' });
    const m = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: { userId: req.userId!, communityId: post.communityId },
      },
    });
    if (!m) return res.status(403).json({ error: 'Forbidden' });
    const audit = await prisma.auditLog.findMany({
      where: { entityType: 'Post', entityId: post.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { actor: { select: { id: true, name: true } } },
    });
    res.json({ post, audit });
  } catch (e) {
    next(e);
  }
});

postsRouter.post(
  '/posts/:postId/actions',
  requireAuth,
  loadUser,
  async (req: Request, res, next) => {
    try {
      const pid = String(req.params.postId);
      const post = await prisma.post.findUnique({ where: { id: pid } });
      if (!post) return res.status(404).json({ error: 'Not found' });
      const m = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: { userId: req.userId!, communityId: post.communityId },
        },
      });
      if (!m || (m.role !== CommunityRole.MODERATOR && m.role !== CommunityRole.ADMIN)) {
        return res.status(403).json({ error: 'Moderator only' });
      }
      const body = postActionSchema.parse(req.body);
      await moderatorAction(
        post.id,
        req.userId!,
        body.action as ModerationActionType,
        body.reason
      );
      const updated = await prisma.post.findUnique({
        where: { id: post.id },
        include: { moderationResult: true },
      });
      res.json({ post: updated });
    } catch (e) {
      if (e instanceof ZodError) return res.status(400).json({ error: e.flatten() });
      next(e);
    }
  }
);

postsRouter.post(
  '/posts/:postId/reanalyze',
  requireAuth,
  loadUser,
  async (req: Request, res, next) => {
    try {
      const pid = String(req.params.postId);
      const post = await prisma.post.findUnique({ where: { id: pid } });
      if (!post) return res.status(404).json({ error: 'Not found' });
      const m = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: { userId: req.userId!, communityId: post.communityId },
        },
      });
      if (!m || (m.role !== CommunityRole.MODERATOR && m.role !== CommunityRole.ADMIN)) {
        return res.status(403).json({ error: 'Moderator only' });
      }
      await reanalyzePost(post.id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);
