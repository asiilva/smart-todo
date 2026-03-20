import { Router } from 'express';
import { authenticate } from '../middleware/auth';

export const boardRouter = Router();
boardRouter.use(authenticate);

boardRouter.get('/', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

boardRouter.post('/', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

boardRouter.get('/:id', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

boardRouter.get('/:boardId/tasks', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

boardRouter.post('/:boardId/tasks', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});
