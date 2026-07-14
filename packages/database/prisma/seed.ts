import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const email = 'dev@desemcp.local';

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Dev User',
        emailVerified: true,
      },
    });
    console.log(`Created user: ${user.email} (${user.id})`);
  }

  let org = await prisma.organization.findFirst({ where: { slug: 'desemcp-dev' } });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Dese MCP Dev',
        slug: 'desemcp-dev',
        members: {
          create: { userId: user.id, role: 'owner' },
        },
      },
    });
    console.log(`Created organization: ${org.name} (${org.id})`);
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  console.log('\n--- Development Credentials ---');
  console.log(`Organization ID: ${org.id}`);
  console.log(`Session Token:   ${token}`);
  console.log('\nAdd these to Settings in the dashboard or use as Bearer token.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
