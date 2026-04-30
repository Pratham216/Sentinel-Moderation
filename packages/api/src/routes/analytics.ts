import { Router, type Request } from 'express';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { ModerationRecommendation, ModerationActionType } from '@prisma/client';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/communities/:communityId/analytics',
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

      const range = (req.query.range as string) || '7d';
      let since: Date;
      let days = 7;

      if (range === '1d') {
        since = new Date();
        since.setHours(0, 0, 0, 0); 
        days = 1;
      } else {
        days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
        since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }

      const posts = await prisma.post.findMany({
        where: { communityId: cid, createdAt: { gte: since } },
        include: { moderationResult: true },
      });

      const volumeByDay: Record<string, number> = {};
      const toxicitySumByDay: Record<string, { sum: number; n: number }> = {};
      const decisions: Record<string, number> = {
        APPROVED: 0,
        REJECTED: 0,
        FLAGGED: 0,
        PENDING: 0,
      };

      for (const p of posts) {
        const d = p.createdAt.toISOString().slice(0, 10);
        volumeByDay[d] = (volumeByDay[d] || 0) + 1;
        if (p.moderationResult) {
          const t = toxicitySumByDay[d] || { sum: 0, n: 0 };
          t.sum += p.moderationResult.toxicity;
          t.n += 1;
          toxicitySumByDay[d] = t;
        }
        decisions[p.status] = (decisions[p.status] || 0) + 1;
      }

      const toxicityTrend = Object.entries(toxicitySumByDay).map(([day, v]) => ({
        day,
        avgToxicity: v.n ? v.sum / v.n : 0,
      }));

      const modActions = await prisma.moderationAction.findMany({
        where: {
          post: { communityId: cid },
          createdAt: { gte: since },
        },
        include: {
          post: { include: { moderationResult: true } },
          moderator: true,
        },
      });

      const dailyManualActions: Record<string, number> = {};
      let falsePositives = 0;
      let overrides = 0;
      for (const a of modActions) {
        const d = a.createdAt.toISOString().slice(0, 10);
        dailyManualActions[d] = (dailyManualActions[d] || 0) + 1;

        const mr = a.post.moderationResult;
        if (!mr) continue;
        if (
          (a.action === ModerationActionType.APPROVE && mr.recommendation === ModerationRecommendation.REJECT) ||
          (a.action === ModerationActionType.REJECT && mr.recommendation === ModerationRecommendation.APPROVE)
        ) {
          falsePositives += 1;
        }
        overrides += 1;
      }

      const latencyHistory = posts
        .filter(p => p.moderationResult?.latencyMs != null)
        .slice(-10)
        .map(p => ({
          time: p.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: p.moderationResult?.latencyMs || 0
        }));

      const systemEvents = modActions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          type: 'MODERATION',
          title: `Post ${a.action}ED`,
          desc: `${a.moderator?.name || 'System'} performed ${a.action.toLowerCase()} action on post #${a.postId.slice(0,6).toUpperCase()}.`,
          time: a.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'SUCCESS',
          icon: a.action === 'APPROVE' ? 'verified' : a.action === 'REJECT' ? 'block' : 'warning',
          color: a.action === 'APPROVE' ? 'text-emerald-500' : 'text-rose-500',
          bg: a.action === 'APPROVE' ? 'bg-emerald-50' : 'bg-rose-50'
        }));

      const [absTotal, absApproved, absRejected, absPending, absFlagged, humanReviewed] = await Promise.all([
        prisma.post.count({ where: { communityId: cid } }),
        prisma.post.count({ where: { communityId: cid, status: 'APPROVED' } }),
        prisma.post.count({ where: { communityId: cid, status: 'REJECTED' } }),
        prisma.post.count({ where: { communityId: cid, status: 'PENDING' } }),
        prisma.post.count({ where: { communityId: cid, status: 'FLAGGED' } }),
        prisma.post.count({
          where: {
            communityId: cid,
            actions: { some: {} },
          },
        }),
      ]);

      const withResult = posts.filter((p) => p.moderationResult?.latencyMs != null);
      const avgResponseMs = withResult.length > 0
        ? withResult.reduce((acc, p) => acc + (p.moderationResult?.latencyMs || 0), 0) / withResult.length
        : 0;

      const volumeByDaySorted = Object.entries(volumeByDay)
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => a.day.localeCompare(b.day));

      const toxicityTrendSorted = Object.entries(toxicitySumByDay)
        .map(([day, v]) => ({
          day,
          avgToxicity: v.n ? v.sum / v.n : 0,
        }))
        .sort((a, b) => a.day.localeCompare(b.day));

      const activityTrendsSorted = Object.entries(volumeByDay)
        .map(([day, count]) => ({
          day: day.slice(5), // Short date MM-DD
          ai: count,
          manual: dailyManualActions[day] || 0,
          fullDay: day,
        }))
        .sort((a, b) => a.fullDay.localeCompare(b.fullDay))
        .map(({ fullDay, ...rest }) => rest);

      res.json({
        range: `${days}d`,
        volumeByDay: volumeByDaySorted,
        toxicityTrend: toxicityTrendSorted,
        latencyHistory,
        systemEvents,
        activityTrends: activityTrendsSorted,
        decisions,
        moderationAccuracy: {
          falsePositiveRate: overrides > 0 ? falsePositives / overrides : 0,
          falsePositives,
          overrides,
        },
        avgResponseTimeMs: avgResponseMs,
        totalPosts: absTotal,
        completedPosts: humanReviewed,
        avgTrustScore: absTotal > 0 ? (absApproved / absTotal) * 100 : 0,
        stats: {
          total: absTotal,
          approved: absApproved,
          rejected: absRejected,
          pending: absPending,
          flagged: absFlagged,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);
