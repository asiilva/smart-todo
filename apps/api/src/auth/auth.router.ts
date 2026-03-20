import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret';

const BCRYPT_ROUNDS = 10;

const DEFAULT_CATEGORIES = [
  { name: 'work', color: '#3B82F6', isDefault: true },
  { name: 'exercise', color: '#10B981', isDefault: true },
  { name: 'family', color: '#F59E0B', isDefault: true },
  { name: 'personal', color: '#8B5CF6', isDefault: true },
  { name: 'errand', color: '#EF4444', isDefault: true },
  { name: 'learning', color: '#06B6D4', isDefault: true },
];

const DEFAULT_COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

// --- Validation schemas ---

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// --- Helpers ---

function generateTokens(user: { id: string; email: string }) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' },
  );

  return { accessToken, refreshToken };
}

// --- Router ---

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      throw new AppError(400, message);
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, 'Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        categories: {
          createMany: {
            data: DEFAULT_CATEGORIES,
          },
        },
        boards: {
          create: {
            name: 'My Board',
            columns: {
              createMany: {
                data: DEFAULT_COLUMNS.map((colName, index) => ({
                  name: colName,
                  position: index,
                })),
              },
            },
          },
        },
        dailySettings: {
          create: {
            availableFrom: '07:00',
            availableUntil: '22:00',
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const tokens = generateTokens(user);

    res.status(201).json({ user, tokens });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      throw new AppError(400, message);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const tokens = generateTokens(user);

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, tokens });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      throw new AppError(400, message);
    }

    const { refreshToken } = parsed.data;

    let payload: { userId: string; email: string };
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
        userId: string;
        email: string;
      };
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const tokens = generateTokens({ id: payload.userId, email: payload.email });

    res.json({ tokens });
  } catch (err) {
    next(err);
  }
});
