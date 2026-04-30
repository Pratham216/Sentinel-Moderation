import OpenAI from 'openai';
import { ModerationRecommendation } from '@prisma/client';
import type { CommunityRule } from '@nebula/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { buildSystemPrompt } from './prompts.js';
import type { ModerationOutput } from './types.js';

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: env.OPENROUTER_API_KEY || 'sk-mock',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': env.WEB_ORIGIN,
      'X-Title': 'Nebula Moderation',
    },
  });
}

function parseOutput(raw: string): ModerationOutput {
  const j = JSON.parse(raw) as Record<string, unknown>;
  const rec = String(j.recommendation || 'FLAG').toUpperCase();
  const recommendation =
    rec === 'APPROVE'
      ? ModerationRecommendation.APPROVE
      : rec === 'REJECT'
        ? ModerationRecommendation.REJECT
        : ModerationRecommendation.FLAG;

  return {
    toxicity: Math.min(1, Math.max(0, Number(j.toxicity ?? 0.5))),
    sentiment: Math.min(1, Math.max(-1, Number(j.sentiment ?? 0))),
    categories: Array.isArray(j.categories) ? (j.categories as string[]) : [],
    ruleViolations: Array.isArray(j.ruleViolations)
      ? (j.ruleViolations as { ruleId: string; reason: string }[])
      : [],
    recommendation,
    reasoning: String(j.reasoning ?? ''),
    confidence: Math.min(1, Math.max(0, Number(j.confidence ?? 0.5))),
  };
}

function mockOutput(): ModerationOutput {
  return {
    toxicity: 0.35,
    sentiment: 0,
    categories: [],
    ruleViolations: [],
    recommendation: ModerationRecommendation.FLAG,
    reasoning: 'No OPENROUTER_API_KEY set; mock result for development.',
    confidence: 0.5,
  };
}

export async function analyzeContent(input: {
  text: string;
  imageUrls?: string[];
  rules: CommunityRule[];
  model?: string;
}): Promise<ModerationOutput> {
  if (!env.OPENROUTER_API_KEY) {
    logger.warn('OPENROUTER_API_KEY missing — using mock moderation output');
    return mockOutput();
  }

  const model = input.model || env.OPENROUTER_MODEL;
  const client = getClient();
  const started = Date.now();

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: 'text', text: input.text || '(no text)' },
  ];
  for (const url of input.imageUrls || []) {
    userContent.push({
      type: 'image_url',
      image_url: { url },
    } as OpenAI.Chat.Completions.ChatCompletionContentPart);
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(input.rules) },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2048,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const out = parseOutput(raw);
    logger.debug({ latencyMs: Date.now() - started, model }, 'openrouter.analyzeContent');
    return out;
  } catch (e) {
    logger.error(e, 'openrouter.analyzeContent failed');
    throw e;
  }
}
