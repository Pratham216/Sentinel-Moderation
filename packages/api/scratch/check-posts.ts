import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cid = 'cmolmhfjd0001vqw09v1c3ls7';
  const counts = await prisma.post.groupBy({
    by: ['status'],
    where: { communityId: cid },
    _count: true
  });
  console.log('Post counts by status:', counts);
  
  const allPosts = await prisma.post.findMany({
    where: { communityId: cid },
    select: { id: true, status: true, text: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Recent posts:', allPosts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
