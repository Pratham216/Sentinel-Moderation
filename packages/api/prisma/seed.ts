import 'dotenv/config';
import { PrismaClient, CommunityRole, PostStatus, GlobalRole, ModerationActionType, ModerationRecommendation } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function aprilDate(dayMin = 20, dayMax = 29) {
  const day = Math.floor(randomBetween(dayMin, dayMax + 1));
  const hour = Math.floor(randomBetween(0, 24));
  const min  = Math.floor(randomBetween(0, 60));
  return new Date(`2026-04-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00Z`);
}

async function main() {
  console.log('--- Starting Final Seed ---');
  await prisma.auditLog.deleteMany({});
  await prisma.trustEvent.deleteMany({});
  await prisma.moderationAction.deleteMany({});
  await prisma.moderationResult.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.communityMember.deleteMany({});
  await prisma.community.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  const saltRounds = 1;
  const adminPass = await bcrypt.hash('adminadmin', saltRounds);

  const admin = await prisma.user.create({
    data: { 
      email: 'admin@nebula.test', 
      name: 'Admin', 
      passwordHash: adminPass, 
      globalRole: GlobalRole.ADMIN, 
      trustScore: 100,
      avatarUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop'
    },
  });
  const mod = await prisma.user.create({
    data: { 
      email: 'mod@nebula.test', 
      name: 'Moderator', 
      passwordHash: adminPass, 
      trustScore: 95,
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop'
    },
  });
  const user = await prisma.user.create({
    data: { 
      email: 'user@nebula.test', 
      name: 'Member', 
      passwordHash: adminPass, 
      trustScore: 85,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop'
    },
  });

  const c1 = await prisma.community.create({
    data: {
      slug: 'main',
      name: 'Main Community',
      ownerId: admin.id,
      webhookSecret: crypto.randomBytes(16).toString('hex'),
      rules: [
        { id: 'r1', title: 'Respect', description: 'Maintain professional conduct and avoid harassment.', severity: 'high' },
        { id: 'r2', title: 'No Spam', description: 'Avoid repetitive or low-quality commercial content.', severity: 'medium' },
        { id: 'r3', title: 'Safety First', description: 'Do not post self-harm or illegal content.', severity: 'high' },
        { id: 'r4', title: 'IP Protection', description: 'Only post content you have the rights to share.', severity: 'low' }
      ],
      settings: {},
    },
  });

  await prisma.communityMember.createMany({
    data: [
      { userId: admin.id, communityId: c1.id, role: CommunityRole.ADMIN },
      { userId: mod.id, communityId: c1.id, role: CommunityRole.MODERATOR },
      { userId: user.id, communityId: c1.id, role: CommunityRole.USER },
    ],
  });

  /**
   * Goal: 100 posts total
   * 20 in Queue (Status: FLAGGED) -> Safety Score 30-75% (Toxicity 0.25-0.70)
   * 5 Removed (Status: REJECTED) -> Safety Score < 30% (Toxicity > 0.70)
   * 75 Approved (Status: APPROVED) -> Safety Score > 75% (Toxicity < 0.25)
   */
  console.log('Seeding 100 posts (safety-score optimized)...');
  for (let i = 0; i < 100; i++) {
    let status = PostStatus.APPROVED;
    let toxicity = randomBetween(0.01, 0.24); // Default for Approved (S > 75%)

    if (i < 20) {
      status = PostStatus.FLAGGED;
      toxicity = randomBetween(0.25, 0.70); // Flagged range (S 30-75%)
    } else if (i < 25) {
      status = PostStatus.REJECTED;
      toxicity = randomBetween(0.71, 0.99); // Rejected range (S < 30%)
    }

    const date = aprilDate(20, 29);
    
    await prisma.post.create({
      data: {
        communityId: c1.id,
        authorId: i % 3 === 0 ? user.id : i % 3 === 1 ? mod.id : admin.id,
        text: `[seed ${i}] April moderation review content update.`,
        status,
        createdAt: date,
        moderationResult: {
          create: {
            provider: 'sentinel-ai-v3',
            model: 'toxicity-full',
            toxicity,
            sentiment: toxicity > 0.5 ? -0.8 : 0.8,
            categories: {},
            ruleViolations: [],
            recommendation: toxicity > 0.7 ? ModerationRecommendation.REJECT : (toxicity > 0.25 ? ModerationRecommendation.FLAG : ModerationRecommendation.APPROVE),
            reasoning: 'Seeded for dashboard restoration.',
            confidence: randomBetween(0.88, 0.98),
            latencyMs: Math.floor(randomBetween(40, 120)),
            createdAt: date,
          }
        },
      },
    });

    if ((i + 1) % 25 === 0) console.log(`  Processed ${i+1} posts...`);
  }

  console.log('✅ Final Seed complete: 100 posts, 20 in queue, 5 removed, 75 approved.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
