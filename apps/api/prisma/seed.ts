import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'work', color: '#3B82F6', isDefault: true },
  { name: 'exercise', color: '#10B981', isDefault: true },
  { name: 'family', color: '#F59E0B', isDefault: true },
  { name: 'personal', color: '#8B5CF6', isDefault: true },
  { name: 'errand', color: '#EF4444', isDefault: true },
  { name: 'learning', color: '#06B6D4', isDefault: true },
];

const DEFAULT_COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@smarttodo.com' },
    update: {},
    create: {
      email: 'admin@smarttodo.com',
      passwordHash,
      name: 'Admin User',
    },
  });

  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: cat.name } },
      update: {},
      create: { userId: user.id, ...cat },
    });
  }

  const board = await prisma.board.upsert({
    where: { id: 'default-board' },
    update: {},
    create: { id: 'default-board', userId: user.id, name: 'Main Board' },
  });

  for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
    await prisma.column.upsert({
      where: { id: `default-column-${i}` },
      update: {},
      create: { id: `default-column-${i}`, boardId: board.id, name: DEFAULT_COLUMNS[i], position: i },
    });
  }

  await prisma.dailySettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, availableFrom: '07:00', availableUntil: '22:00' },
  });

  console.log('Seed completed.');
  console.log(`  User: ${user.email} / password123`);
  console.log(`  Board: ${board.name}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
