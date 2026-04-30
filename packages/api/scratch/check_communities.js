import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const communities = await prisma.community.findMany();
  console.log(JSON.stringify(communities, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
