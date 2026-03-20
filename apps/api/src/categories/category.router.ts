import { Router } from 'express';
import { authenticate } from '../middleware/auth';

export const categoryRouter = Router();
categoryRouter.use(authenticate);

categoryRouter.get('/', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

categoryRouter.post('/', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

categoryRouter.put('/:id', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

categoryRouter.delete('/:id', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});
