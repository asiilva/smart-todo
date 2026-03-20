import { Router } from 'express';
import { authenticate } from '../middleware/auth';

export const taskRouter = Router();
taskRouter.use(authenticate);

taskRouter.put('/:id', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

taskRouter.patch('/:id/move', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

taskRouter.delete('/:id', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

taskRouter.post('/:id/timer/start', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

taskRouter.post('/:id/timer/stop', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

taskRouter.get('/:id/time-entries', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});
