
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { globalRole: 'ADMIN' } });
  if (!admin) {
    console.error('No admin user found to own the community');
    return;
  }

  const community = await prisma.community.upsert({
    where: { slug: 'main' },
    update: {},
    create: {
      slug: 'main',
      name: 'Main Community',
      description: 'Default community',
      ownerId: admin.id,
      webhookSecret: crypto.randomBytes(16).toString('hex'),
      rules: [],
      settings: {},
    },
  });
  console.log('Main community ensured:', community.id);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
