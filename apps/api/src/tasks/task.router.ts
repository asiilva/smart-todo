import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';

export const taskRouter = Router();
taskRouter.use(authenticate);

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  projectedDurationMinutes: z.number().int().positive().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  labels: z.array(z.string()).optional(),
  scheduledDate: z.string().datetime().nullable().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
  dueDate: z.string().datetime().nullable().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
});

const moveTaskSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number().int().min(0),
});

/**
 * Helper: verify task belongs to user's board.
 * Returns the task with its column and board.
 */
async function verifyTaskOwnership(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: {
        include: {
          board: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  if (task.column.board.userId !== userId) {
    throw new AppError(403, 'Access denied');
  }

  return task;
}

// PUT /:id — Update task fields
taskRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await verifyTaskOwnership(id, userId);

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { scheduledDate, dueDate, ...rest } = parsed.data;

    const data: Record<string, any> = { ...rest };
    if (scheduledDate !== undefined) {
      data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }
    if (dueDate !== undefined) {
      data.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data,
    });

    res.json(updatedTask);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/move — Move task to new column and/or position
taskRouter.patch('/:id/move', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const task = await verifyTaskOwnership(id, userId);

    const parsed = moveTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { columnId: newColumnId, position: newPosition } = parsed.data;

    // Verify the target column belongs to the same board
    const targetColumn = await prisma.column.findUnique({
      where: { id: newColumnId },
    });

    if (!targetColumn) {
      throw new AppError(404, 'Target column not found');
    }

    if (targetColumn.boardId !== task.column.boardId) {
      throw new AppError(400, 'Target column does not belong to the same board');
    }

    const oldColumnId = task.columnId;
    const oldPosition = task.position;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      if (oldColumnId === newColumnId) {
        // Moving within the same column
        if (oldPosition < newPosition) {
          // Moving down: shift items between old+1..new up by 1
          await tx.task.updateMany({
            where: {
              columnId: oldColumnId,
              position: { gt: oldPosition, lte: newPosition },
            },
            data: { position: { decrement: 1 } },
          });
        } else if (oldPosition > newPosition) {
          // Moving up: shift items between new..old-1 down by 1
          await tx.task.updateMany({
            where: {
              columnId: oldColumnId,
              position: { gte: newPosition, lt: oldPosition },
            },
            data: { position: { increment: 1 } },
          });
        }
      } else {
        // Moving to a different column
        // Close gap in old column
        await tx.task.updateMany({
          where: {
            columnId: oldColumnId,
            position: { gt: oldPosition },
          },
          data: { position: { decrement: 1 } },
        });

        // Make room in new column
        await tx.task.updateMany({
          where: {
            columnId: newColumnId,
            position: { gte: newPosition },
          },
          data: { position: { increment: 1 } },
        });
      }

      // Move the task itself
      await tx.task.update({
        where: { id },
        data: {
          columnId: newColumnId,
          position: newPosition,
        },
      });
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: { column: true },
    });

    res.json(updatedTask);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — Delete task and related time entries
taskRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const task = await verifyTaskOwnership(id, userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // Delete related time entries
      await tx.timeEntry.deleteMany({
        where: { taskId: id },
      });

      // Delete the task
      await tx.task.delete({
        where: { id },
      });

      // Close gap in column positions
      await tx.task.updateMany({
        where: {
          columnId: task.columnId,
          position: { gt: task.position },
        },
        data: { position: { decrement: 1 } },
      });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /:id/timer/start — Start timer
taskRouter.post('/:id/timer/start', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const task = await verifyTaskOwnership(id, userId);

    // Check if there's already an active timer
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { taskId: id, stoppedAt: null },
    });

    if (activeEntry) {
      throw new AppError(400, 'Timer is already running for this task');
    }

    const now = new Date();

    const timeEntry = await prisma.timeEntry.create({
      data: {
        taskId: id,
        userId,
        startedAt: now,
      },
    });

    // Set task.startedAt if not already set
    if (!task.startedAt) {
      await prisma.task.update({
        where: { id },
        data: { startedAt: now },
      });
    }

    res.status(201).json(timeEntry);
  } catch (err) {
    next(err);
  }
});

// POST /:id/timer/stop — Stop timer
taskRouter.post('/:id/timer/stop', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await verifyTaskOwnership(id, userId);

    // Find the active time entry
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { taskId: id, stoppedAt: null },
    });

    if (!activeEntry) {
      throw new AppError(400, 'No active timer found for this task');
    }

    const now = new Date();
    const durationMs = now.getTime() - activeEntry.startedAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: activeEntry.id },
      data: {
        stoppedAt: now,
        durationMinutes,
      },
    });

    // Update task's executedDurationMinutes
    await prisma.task.update({
      where: { id },
      data: {
        executedDurationMinutes: { increment: durationMinutes },
      },
    });

    res.json(updatedEntry);
  } catch (err) {
    next(err);
  }
});

// GET /:id/time-entries — List time entries for a task
taskRouter.get('/:id/time-entries', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await verifyTaskOwnership(id, userId);

    const timeEntries = await prisma.timeEntry.findMany({
      where: { taskId: id },
      orderBy: { startedAt: 'desc' },
    });

    res.json(timeEntries);
  } catch (err) {
    next(err);
  }
});
