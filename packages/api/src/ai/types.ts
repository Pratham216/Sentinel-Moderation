import type { ModerationRecommendation } from '@prisma/client';

export interface ModerationOutput {
  toxicity: number;
  sentiment: number;
  categories: string[];
  ruleViolations: { ruleId: string; reason: string }[];
  recommendation: ModerationRecommendation;
  reasoning: string;
  confidence: number;
}
