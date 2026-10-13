-- 006_user_soft_delete.sql
-- Idempotent. Account deletion is a soft delete with a 30-day recovery window:
-- deleted_at set = the account and all of its data are hidden; after 30 days the
-- server permanently removes the user and everything they own.

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ix_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;
