import type { CommunityRule } from '@nebula/shared';

export function buildSystemPrompt(rules: CommunityRule[]): string {
  const rulesBlock =
    rules.length === 0
      ? 'No explicit community rules provided; apply general safety and civility.'
      : rules
          .map((r) => `- [${r.id}] ${r.title} (${r.severity}): ${r.description}`)
          .join('\n');

  return `You are a community moderation assistant. Analyze the user content (text and optional images) against the rules below.

Community rules:
${rulesBlock}

Respond with a single JSON object only (no markdown) with this exact shape:
{
  "toxicity": number between 0 and 1,
  "sentiment": number between -1 and 1,
  "categories": string[] (e.g. spam, harassment, nsfw),
  "ruleViolations": [ { "ruleId": string, "reason": string } ],
  "recommendation": "APPROVE" | "FLAG" | "REJECT",
  "reasoning": string,
  "confidence": number between 0 and 1
}

Use recommendation APPROVE if content clearly complies; FLAG if uncertain or minor issues; REJECT for clear violations.`;
}
