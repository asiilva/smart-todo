import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './auth/auth.router';
import { userRouter } from './users/user.router';
import { boardRouter } from './boards/board.router';
import { taskRouter } from './tasks/task.router';
import { categoryRouter } from './categories/category.router';
import { plannerRouter } from './planner/planner.router';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/boards', boardRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/planner', plannerRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});

export default app;
