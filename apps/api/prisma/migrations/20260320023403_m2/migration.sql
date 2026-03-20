-- CreateIndex
CREATE INDEX "protected_time_blocks_user_id_recurring_day_of_week_idx" ON "protected_time_blocks"("user_id", "recurring", "day_of_week");

-- CreateIndex
CREATE INDEX "tasks_column_id_position_idx" ON "tasks"("column_id", "position");

-- CreateIndex
CREATE INDEX "tasks_scheduled_date_idx" ON "tasks"("scheduled_date");

-- CreateIndex
CREATE INDEX "time_entries_task_id_stopped_at_idx" ON "time_entries"("task_id", "stopped_at");
