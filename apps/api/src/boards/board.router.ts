import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';

export const boardRouter = Router();
boardRouter.use(authenticate);

const createBoardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  notes: z.string().optional(),
  projectedDurationMinutes: z.number().int().positive().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  columnId: z.string().uuid().optional(),
  labels: z.array(z.string()).optional(),
  scheduledDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  dueDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

const DEFAULT_COLUMNS = [
  { name: 'Backlog', position: 0 },
  { name: 'To Do', position: 1 },
  { name: 'In Progress', position: 2 },
  { name: 'Review', position: 3 },
  { name: 'Done', position: 4 },
];

// GET / — List boards for current user, include columns ordered by position
boardRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const boards = await prisma.board.findMany({
      where: { userId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(boards);
  } catch (err) {
    next(err);
  }
});

// POST / — Create a board with default columns
boardRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const parsed = createBoardSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    const board = await prisma.board.create({
      data: {
        name: parsed.data.name,
        userId,
        columns: {
          create: DEFAULT_COLUMNS,
        },
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.status(201).json(board);
  } catch (err) {
    next(err);
  }
});

// GET /:id — Get board by id (verify ownership), include columns with tasks
boardRouter.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!board) {
      throw new AppError(404, 'Board not found');
    }

    if (board.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    res.json(board);
  } catch (err) {
    next(err);
  }
});

// GET /:boardId/tasks — Get all tasks for a board grouped by column
boardRouter.get('/:boardId/tasks', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { boardId } = req.params;

    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new AppError(404, 'Board not found');
    }

    if (board.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      include: {
        tasks: {
          orderBy: { position: 'asc' },
          include: {
            timeEntries: true,
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped = columns.map((col: any) => ({
      columnId: col.id,
      columnName: col.name,
      position: col.position,
      tasks: col.tasks,
    }));

    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

// POST /:boardId/tasks — Create a task
boardRouter.post('/:boardId/tasks', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { boardId } = req.params;

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!board) {
      throw new AppError(404, 'Board not found');
    }

    if (board.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    if (board.columns.length === 0) {
      throw new AppError(400, 'Board has no columns');
    }

    const { title, description, notes, projectedDurationMinutes, priority, category, columnId, labels, scheduledDate, dueDate } = parsed.data;

    // Determine target column
    let targetColumnId = columnId;
    if (targetColumnId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const columnExists = board.columns.find((c: any) => c.id === targetColumnId);
      if (!columnExists) {
        throw new AppError(400, 'Column does not belong to this board');
      }
    } else {
      targetColumnId = board.columns[0].id; // Backlog (first column)
    }

    // Get max position in target column
    const maxPositionTask = await prisma.task.findFirst({
      where: { columnId: targetColumnId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = maxPositionTask ? maxPositionTask.position + 1 : 0;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        notes,
        projectedDurationMinutes,
        priority: priority as any,
        category: category ?? 'work',
        columnId: targetColumnId,
        labels: labels ?? [],
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        position,
      },
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});
