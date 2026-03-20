import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';

export const categoryRouter = Router();
categoryRouter.use(authenticate);

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color (e.g. #ff0000)'),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color').optional(),
});

// GET / — List categories for current user
categoryRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST / — Create custom category
categoryRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { name, color } = parsed.data;

    // Check for duplicate name
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name } },
    });

    if (existing) {
      throw new AppError(409, 'A category with this name already exists');
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name,
        color,
        isDefault: false,
      },
    });

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// PUT /:id — Update category name/color
categoryRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    if (category.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    if (category.isDefault) {
      throw new AppError(400, 'Cannot update default categories');
    }

    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
    }

    // If renaming, check for duplicate
    if (parsed.data.name && parsed.data.name !== category.name) {
      const existing = await prisma.category.findUnique({
        where: { userId_name: { userId, name: parsed.data.name } },
      });
      if (existing) {
        throw new AppError(409, 'A category with this name already exists');
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — Delete category
categoryRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    if (category.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    if (category.isDefault) {
      throw new AppError(400, 'Cannot delete default categories');
    }

    await prisma.category.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
