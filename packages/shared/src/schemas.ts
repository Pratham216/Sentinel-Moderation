import { z } from 'zod';

export const communityRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
});

export const communitySettingsSchema = z.object({
  autoApproveBelow: z.number().min(0).max(1).optional(),
  autoRejectAbove: z.number().min(0).max(1).optional(),
  openRouterModel: z.string().optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createCommunitySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

export const createPostSchema = z.object({
  text: z.string().min(1),
  mediaUrls: z.array(z.string().url()).optional(),
});

export const postActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'FLAG', 'UNFLAG']),
  reason: z.string().optional(),
});

export const webhookIngestSchema = z.object({
  externalId: z.string().optional(),
  author: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  text: z.string().min(1),
  mediaUrls: z.array(z.string().url()).optional(),
});
