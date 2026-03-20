import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';

export const plannerRouter = Router();
plannerRouter.use(authenticate);

// --- Zod schemas ---

const settingsSchema = z.object({
  availableFrom: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  availableUntil: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
});

const protectedBlockSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  recurring: z.boolean(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// --- Helpers ---

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// --- GET /:date — Get daily plan ---

plannerRouter.get('/:date', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(400, 'Date must be in YYYY-MM-DD format');
    }

    // Use noon UTC to avoid timezone boundary issues with @db.Date
    const targetDate = new Date(date + 'T12:00:00.000Z');
    const dayOfWeek = targetDate.getUTCDay();

    // For Prisma @db.Date, compare using a range to avoid timezone issues
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    // Fetch tasks scheduled for this date
    const tasks = await prisma.task.findMany({
      where: {
        scheduledDate: { gte: startOfDay, lte: endOfDay },
        column: {
          board: {
            userId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        projectedDurationMinutes: true,
        executedDurationMinutes: true,
        category: true,
        priority: true,
      },
      orderBy: { position: 'asc' },
    });

    // Fetch protected time blocks (recurring by day_of_week OR specific_date match)
    const protectedBlocks = await prisma.protectedTimeBlock.findMany({
      where: {
        userId,
        OR: [
          { recurring: true, dayOfWeek },
          { specificDate: targetDate },
        ],
      },
      select: {
        id: true,
        title: true,
        category: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Fetch or default daily settings
    const settingsRow = await prisma.dailySettings.findUnique({
      where: { userId },
    });
    const settings = {
      availableFrom: settingsRow?.availableFrom ?? '07:00',
      availableUntil: settingsRow?.availableUntil ?? '22:00',
    };

    // Calculate summary
    const availableMinutes = timeToMinutes(settings.availableUntil) - timeToMinutes(settings.availableFrom);

    let totalProjectedMinutes = 0;
    let totalExecutedMinutes = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const task of tasks) {
      const projected = task.projectedDurationMinutes ?? 0;
      totalProjectedMinutes += projected;
      totalExecutedMinutes += task.executedDurationMinutes;
      categoryBreakdown[task.category] = (categoryBreakdown[task.category] ?? 0) + projected;
    }

    // Include protected blocks in projected time and category breakdown
    for (const block of protectedBlocks) {
      const blockMinutes = timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
      totalProjectedMinutes += blockMinutes;
      categoryBreakdown[block.category] = (categoryBreakdown[block.category] ?? 0) + blockMinutes;
    }

    const isOverbooked = totalProjectedMinutes > availableMinutes;

    res.json({
      tasks,
      protectedBlocks,
      settings,
      summary: {
        totalProjectedMinutes,
        totalExecutedMinutes,
        availableMinutes,
        categoryBreakdown,
        isOverbooked,
      },
    });
  } catch (err) {
    next(err);
  }
});

// --- PUT /settings — Update daily settings ---

plannerRouter.put('/settings', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const parsed = settingsSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { availableFrom, availableUntil } = parsed.data;

    if (timeToMinutes(availableFrom) >= timeToMinutes(availableUntil)) {
      throw new AppError(400, 'availableFrom must be before availableUntil');
    }

    const settings = await prisma.dailySettings.upsert({
      where: { userId },
      update: {
        availableFrom,
        availableUntil,
      },
      create: {
        userId,
        availableFrom,
        availableUntil,
      },
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// --- POST /protected-blocks — Create protected time block ---

plannerRouter.post('/protected-blocks', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const parsed = protectedBlockSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { title, category, startTime, endTime, recurring, dayOfWeek, specificDate } = parsed.data;

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      throw new AppError(400, 'startTime must be before endTime');
    }

    if (recurring && dayOfWeek === undefined) {
      throw new AppError(400, 'dayOfWeek is required for recurring blocks');
    }

    const block = await prisma.protectedTimeBlock.create({
      data: {
        userId,
        title,
        category,
        startTime,
        endTime,
        recurring,
        dayOfWeek: recurring ? dayOfWeek : null,
        specificDate: specificDate ? new Date(specificDate + 'T00:00:00.000Z') : null,
      },
    });

    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
});

// --- PUT /protected-blocks/:id — Update protected time block ---

plannerRouter.put('/protected-blocks/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.protectedTimeBlock.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Protected time block not found');
    }
    if (existing.userId !== userId) {
      throw new AppError(403, 'Not authorized to update this block');
    }

    const parsed = protectedBlockSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { title, category, startTime, endTime, recurring, dayOfWeek, specificDate } = parsed.data;

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      throw new AppError(400, 'startTime must be before endTime');
    }

    if (recurring && dayOfWeek === undefined) {
      throw new AppError(400, 'dayOfWeek is required for recurring blocks');
    }

    const block = await prisma.protectedTimeBlock.update({
      where: { id },
      data: {
        title,
        category,
        startTime,
        endTime,
        recurring,
        dayOfWeek: recurring ? dayOfWeek : null,
        specificDate: specificDate ? new Date(specificDate + 'T00:00:00.000Z') : null,
      },
    });

    res.json(block);
  } catch (err) {
    next(err);
  }
});

// --- DELETE /protected-blocks/:id — Delete protected time block ---

plannerRouter.delete('/protected-blocks/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.protectedTimeBlock.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Protected time block not found');
    }
    if (existing.userId !== userId) {
      throw new AppError(403, 'Not authorized to delete this block');
    }

    await prisma.protectedTimeBlock.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
