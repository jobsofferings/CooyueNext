BEGIN;

DO $$
BEGIN
  CREATE TYPE "mail_task_status" AS ENUM ('draft', 'queued', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

CREATE TABLE IF NOT EXISTS mail_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject         TEXT NOT NULL,
  template_key    TEXT,
  body_preview    TEXT,
  status          "mail_task_status" NOT NULL DEFAULT 'draft',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  last_error      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mail_tasks_status_idx
  ON mail_tasks (status);

CREATE INDEX IF NOT EXISTS mail_tasks_recipient_email_idx
  ON mail_tasks (recipient_email);

CREATE INDEX IF NOT EXISTS mail_tasks_scheduled_at_idx
  ON mail_tasks (scheduled_at);

DROP TRIGGER IF EXISTS trigger_mail_tasks_updated_at ON mail_tasks;
CREATE TRIGGER trigger_mail_tasks_updated_at
  BEFORE UPDATE ON mail_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
