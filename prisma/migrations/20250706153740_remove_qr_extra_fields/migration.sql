-- CreateIndex
CREATE INDEX "messages_session_id_status_idx" ON "messages"("session_id", "status");

-- CreateIndex
CREATE INDEX "messages_status_created_at_idx" ON "messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "messages_session_id_created_at_idx" ON "messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_status_idx" ON "sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "sessions_worker_id_status_idx" ON "sessions"("worker_id", "status");

-- CreateIndex
CREATE INDEX "sessions_status_updated_at_idx" ON "sessions"("status", "updated_at");

-- CreateIndex
CREATE INDEX "worker_metrics_worker_id_timestamp_idx" ON "worker_metrics"("worker_id", "timestamp");

-- CreateIndex
CREATE INDEX "worker_metrics_timestamp_idx" ON "worker_metrics"("timestamp");
