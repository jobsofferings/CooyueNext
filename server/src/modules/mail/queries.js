const VALID_STATUSES = ["draft", "queued", "sent", "failed"];

function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error(`Invalid status: "${status}"`), { status: 400 });
  }
}

async function listMailTasks({ pool, status = null, search = null, page = 1, pageSize = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    validateStatus(status);
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  if (search) {
    conditions.push(`(recipient_email ILIKE $${idx} OR subject ILIKE $${idx} OR COALESCE(template_key, '') ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx += 1;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (Math.max(1, page) - 1) * pageSize;

  const [countResult, rowsResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM mail_tasks ${where}`, params),
    pool.query(
      `SELECT *
       FROM mail_tasks
       ${where}
       ORDER BY updated_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, pageSize, offset]
    ),
  ]);

  return {
    data: rowsResult.rows,
    total: Number(countResult.rows[0].total),
    page,
    pageSize,
  };
}

async function createMailTask({ pool, data = {} } = {}) {
  const {
    recipient_email,
    subject,
    template_key = null,
    body_preview = null,
    status = "draft",
    scheduled_at = null,
    sent_at = null,
    last_error = null,
    metadata = {},
  } = data;

  if (!recipient_email) {
    throw Object.assign(new Error("recipient_email is required"), { status: 400 });
  }
  if (!subject) {
    throw Object.assign(new Error("subject is required"), { status: 400 });
  }
  validateStatus(status);

  const { rows } = await pool.query(
    `INSERT INTO mail_tasks
       (recipient_email, subject, template_key, body_preview, status, scheduled_at, sent_at, last_error, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      recipient_email,
      subject,
      template_key,
      body_preview,
      status,
      scheduled_at,
      sent_at,
      last_error,
      JSON.stringify(metadata),
    ]
  );

  return rows[0];
}

async function updateMailTask({ pool, id, data = {} } = {}) {
  if (!id) {
    throw Object.assign(new Error("id is required"), { status: 400 });
  }

  const current = await pool.query(`SELECT * FROM mail_tasks WHERE id = $1`, [id]);
  if (!current.rows.length) {
    return null;
  }

  const merged = {
    ...current.rows[0],
    ...data,
    metadata: data.metadata ?? current.rows[0].metadata ?? {},
  };

  validateStatus(merged.status);

  const { rows } = await pool.query(
    `UPDATE mail_tasks
     SET recipient_email = $2,
         subject = $3,
         template_key = $4,
         body_preview = $5,
         status = $6,
         scheduled_at = $7,
         sent_at = $8,
         last_error = $9,
         metadata = $10
     WHERE id = $1
     RETURNING *`,
    [
      id,
      merged.recipient_email,
      merged.subject,
      merged.template_key,
      merged.body_preview,
      merged.status,
      merged.scheduled_at,
      merged.sent_at,
      merged.last_error,
      JSON.stringify(merged.metadata),
    ]
  );

  return rows[0];
}

async function deleteMailTask({ pool, id } = {}) {
  if (!id) {
    throw Object.assign(new Error("id is required"), { status: 400 });
  }

  const { rows } = await pool.query(`DELETE FROM mail_tasks WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

async function setMailTaskStatus({ pool, id, status, last_error = null } = {}) {
  if (!id) {
    throw Object.assign(new Error("id is required"), { status: 400 });
  }
  validateStatus(status);

  const sentAt = status === "sent" ? new Date().toISOString() : null;
  const { rows } = await pool.query(
    `UPDATE mail_tasks
     SET status = $2,
         sent_at = COALESCE($3, sent_at),
         last_error = $4
     WHERE id = $1
     RETURNING *`,
    [id, status, sentAt, last_error]
  );

  return rows[0] || null;
}

module.exports = {
  VALID_STATUSES,
  validateStatus,
  listMailTasks,
  createMailTask,
  updateMailTask,
  deleteMailTask,
  setMailTaskStatus,
};
