import pLimit from 'p-limit';
import {
  ModerationRecommendation,
  ModerationActionType,
  PostStatus,
  Prisma,
} from '@prisma/client';
import type { CommunityRule, CommunitySettings } from '@nebula/shared';
import { prisma } from '../lib/prisma.js';
import { analyzeContent } from '../ai/openrouter.js';
import { emitToCommunity } from '../realtime/socket.js';
import { logger } from '../lib/logger.js';

const limit = pLimit(5);

function getSettings(raw: unknown): CommunitySettings {
  const s = raw as Record<string, unknown>;
  return {
    autoApproveBelow: typeof s.autoApproveBelow === 'number' ? s.autoApproveBelow : 0.25,
    autoRejectAbove: typeof s.autoRejectAbove === 'number' ? s.autoRejectAbove : 0.85,
    openRouterModel:
      typeof s.openRouterModel === 'string' ? s.openRouterModel : undefined,
  };
}

function getRules(raw: unknown): CommunityRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r) => r && typeof r === 'object') as CommunityRule[];
}

function resolveStatus(
  toxicity: number,
  recommendation: ModerationRecommendation,
  settings: CommunitySettings
): PostStatus {
  // Safety Score = 1 - Toxicity
  const safety = 1 - toxicity;

  if (safety < 0.3) return PostStatus.REJECTED;
  if (safety > 0.75) return PostStatus.APPROVED;
  
  return PostStatus.FLAGGED;
}

async function applyTrustDelta(
  tx: Prisma.TransactionClient,
  userId: string,
  delta: number,
  reason: string,
  postId: string
) {
  await tx.trustEvent.create({
    data: { userId, delta, reason, postId },
  });
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (user) {
    const next = Math.max(0, Math.min(100, user.trustScore + delta));
    await tx.user.update({ where: { id: userId }, data: { trustScore: next } });
  }
}

export function scheduleModeration(postId: string): void {
  void limit(() => runModeration(postId)).catch((err) =>
    logger.error({ err, postId }, 'scheduleModeration failed')
  );
}

export async function runModeration(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { community: true },
  });
  if (!post) return;

  const rules = getRules(post.community.rules);
  const settings = getSettings(post.community.settings);
  const model = settings.openRouterModel;

  const started = Date.now();
  let output;
  try {
    output = await analyzeContent({
      text: post.text,
      imageUrls: post.mediaUrls.length ? post.mediaUrls : undefined,
      rules,
      model: typeof model === 'string' ? model : undefined,
    });
  } catch (e) {
    logger.error({ e, postId }, 'runModeration AI error');
    return;
  }

  const latencyMs = Date.now() - started;
  const status = resolveStatus(output.toxicity, output.recommendation, settings);

  await prisma.$transaction(async (tx) => {
    await tx.moderationResult.create({
      data: {
        postId: post.id,
        provider: 'openrouter',
        model:
          (typeof model === 'string' ? model : null) ||
          process.env.OPENROUTER_MODEL ||
          'anthropic/claude-3.5-sonnet',
        toxicity: output.toxicity,
        sentiment: output.sentiment,
        categories: output.categories as object,
        ruleViolations: output.ruleViolations as object,
        recommendation: output.recommendation,
        reasoning: output.reasoning,
        confidence: output.confidence,
        latencyMs,
      },
    });

    await tx.post.update({
      where: { id: post.id },
      data: { status },
    });

    await tx.auditLog.create({
      data: {
        actorId: post.authorId,
        action: 'MODERATION_COMPLETED',
        entityType: 'Post',
        entityId: post.id,
        metadata: {
          status,
          recommendation: output.recommendation,
          automated: true,
        },
      },
    });

    let trustDelta = 0;
    if (status === PostStatus.APPROVED) trustDelta = 2;
    else if (status === PostStatus.REJECTED) trustDelta = -10;
    else if (status === PostStatus.FLAGGED) trustDelta = -2;
    if (trustDelta !== 0) {
      await applyTrustDelta(tx, post.authorId, trustDelta, 'Auto-moderation', post.id);
    }
  });

  emitToCommunity(post.communityId, 'moderation:update', {
    postId: post.id,
    status,
    result: {
      toxicity: output.toxicity,
      confidence: output.confidence,
      recommendation: output.recommendation,
    }
  });
}

/** Manual reanalyze - same as runModeration but delete old result first */
export async function reanalyzePost(postId: string): Promise<void> {
  await prisma.moderationResult.deleteMany({ where: { postId } });
  await prisma.post.update({
    where: { id: postId },
    data: { status: PostStatus.PENDING },
  });
  scheduleModeration(postId);
}

export async function moderatorAction(
  postId: string,
  moderatorId: string,
  action: ModerationActionType,
  reason?: string
) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('Post not found');

  const statusMap: Record<ModerationActionType, PostStatus> = {
    APPROVE: PostStatus.APPROVED,
    REJECT: PostStatus.REJECTED,
    FLAG: PostStatus.FLAGGED,
    UNFLAG: PostStatus.APPROVED,
  };
  const newStatus = statusMap[action];

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: { status: newStatus },
    });
    await tx.moderationAction.create({
      data: {
        postId,
        moderatorId,
        action,
        reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: moderatorId,
        action: `POST_${action}`,
        entityType: 'Post',
        entityId: postId,
        metadata: { reason },
      },
    });
  });

  let fp = false;
  const prev = await prisma.moderationResult.findUnique({ where: { postId } });
  if (
    prev &&
    action === ModerationActionType.APPROVE &&
    prev.recommendation === ModerationRecommendation.REJECT
  ) {
    fp = true;
  }
  if (
    prev &&
    action === ModerationActionType.REJECT &&
    prev.recommendation === ModerationRecommendation.APPROVE
  ) {
    fp = true;
  }

  emitToCommunity(post.communityId, 'action:taken', {
    postId,
    action,
    moderatorId,
    falsePositiveSignal: fp,
  });
}
