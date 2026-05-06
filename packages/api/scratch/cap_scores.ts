import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      trustScore: { gt: 100 }
    }
  });

  console.log(`Found ${users.length} users with trust score > 100`);

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { trustScore: 100 }
    });
    console.log(`Updated user ${user.email} score from ${user.trustScore} to 100`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
