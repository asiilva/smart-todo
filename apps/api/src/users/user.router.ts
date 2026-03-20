import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';

const updateNameSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const techProfileSchema = z.object({
  rawText: z.string().min(1, 'rawText is required'),
});

export const userRouter = Router();
userRouter.use(authenticate);

// GET /me — return current user
userRouter.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /me — update current user's name
userRouter.put('/me', async (req, res, next) => {
  try {
    const parsed = updateNameSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0].message);
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name: parsed.data.name },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /me/profile — create or update tech profile
userRouter.post('/me/profile', async (req, res, next) => {
  try {
    const parsed = techProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0].message);
    }

    const profile = await prisma.techProfile.upsert({
      where: { userId: req.user!.userId },
      create: {
        userId: req.user!.userId,
        rawText: parsed.data.rawText,
      },
      update: {
        rawText: parsed.data.rawText,
      },
    });

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// GET /me/profile — get user's tech profile
userRouter.get('/me/profile', async (req, res, next) => {
  try {
    const profile = await prisma.techProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      throw new AppError(404, 'Tech profile not found');
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});
