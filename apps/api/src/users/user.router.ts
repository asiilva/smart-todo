import { Router } from 'express';
import { authenticate } from '../middleware/auth';

export const userRouter = Router();
userRouter.use(authenticate);

userRouter.get('/me', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

userRouter.put('/me', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

userRouter.post('/me/profile', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

userRouter.get('/me/profile', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});
