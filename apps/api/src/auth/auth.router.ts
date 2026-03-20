import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

authRouter.post('/login', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

authRouter.post('/refresh', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});
