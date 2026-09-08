const mailer = require("../contact/mailer");
const mailQueries = require("../mail/queries");

function inquiryMessage(summary, locale) {
  const chinese = locale === "zh";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.cooyue.tech").replace(/\/+$/, "");
  return [
    chinese ? "产品询盘" : "Product inquiry",
    `${chinese ? "搜索需求" : "Search"}: ${summary.query}`,
    summary.question || "",
    summary.requirements || "",
    "",
    chinese ? "所选产品（平台资料）:" : "Selected products (catalog information):",
    ...summary.products.flatMap((product) => [
      `${product.name} / ${product.categoryName}`,
      ...(product.metrics || []).map((metric) => `${metric.label}: ${metric.value}`),
      `${siteUrl}/${locale}/products/${product.slug}`,
      "",
    ]),
    chinese ? "具体配置、适用性和交期请工作人员确认。" : "Please confirm configuration, suitability and lead time.",
  ].filter((line) => line !== undefined).join("\n");
}

async function prepareDelivery(client, draft, name, email) {
  const config = mailer.getContactMailConfig();
  if (!config.enabled) throw Object.assign(new Error("Inquiry mail service is unavailable; please try again later."), { status: 503 });
  const payload = {
    locale: draft.locale, name, email, message: inquiryMessage(draft.summary, draft.locale),
    pagePath: `/${draft.locale}/search`, submittedAt: new Date().toISOString(),
    messageId: `<cooyue-inquiry-${draft.id}@cooyue.tech>`,
  };
  const content = mailer.buildContactEmail({ ...payload, subjectPrefix: config.subjectPrefix });
  const task = await mailQueries.createMailTask({ pool: client, data: {
    recipient_email: config.recipientEmail, subject: content.subject, body_preview: content.text,
    template_key: "product-inquiry", status: "queued",
    metadata: { source: "product-search", inquiryId: draft.id, locale: draft.locale },
  } });
  await client.query(`UPDATE knowledge.inquiries SET delivery_status = 'sending', contact_name = $2,
    contact_email = $3, mail_task_id = $4 WHERE id = $1`, [draft.id, name, email, task.id]);
  return { payload, task };
}

async function deliverInquiry(pool, id, prepared) {
  let delivery;
  try {
    delivery = await mailer.sendContactEmail(prepared.payload);
  } catch (error) {
    await pool.query("UPDATE knowledge.inquiries SET delivery_status = 'failed' WHERE id = $1", [id]);
    await mailQueries.setMailTaskStatus({ pool, id: prepared.task.id, status: "failed", last_error: "SMTP delivery failed" });
    throw Object.assign(new Error(prepared.payload.locale === "zh" ? "询盘邮件发送失败，请稍后重试。" : "Inquiry email could not be sent. Please try again."), { status: error.status || 502 });
  }
  await pool.query(`UPDATE knowledge.inquiries SET status = 'submitted', delivery_status = 'sent',
    confirmed_at = now(), message_id = $2 WHERE id = $1`, [id, delivery.messageId]);
  try {
    await mailQueries.setMailTaskStatus({ pool, id: prepared.task.id, status: "sent" });
  } catch (error) {
    console.warn("[inquiry] Unable to update mail task status:", error.code || "DATABASE_ERROR");
  }
  return { status: "submitted", delivery: "sent" };
}

module.exports = { inquiryMessage, prepareDelivery, deliverInquiry };
