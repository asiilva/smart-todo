import { Router } from 'express';
import { authenticate } from '../middleware/auth';

export const plannerRouter = Router();
plannerRouter.use(authenticate);

plannerRouter.get('/:date', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

plannerRouter.put('/settings', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

plannerRouter.post('/protected-blocks', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

plannerRouter.put('/protected-blocks/:id', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});

plannerRouter.delete('/protected-blocks/:id', async (req, res, next) => {
  try { res.status(501).json({ error: 'Not implemented' }); } catch (err) { next(err); }
});
