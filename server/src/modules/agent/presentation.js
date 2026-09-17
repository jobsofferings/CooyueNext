const LEGACY_NOTICES = [
  "模型响应超时或暂不可用，已使用只读检索结果和资料摘要。",
  "部分检索能力暂不可用，结果按当前可用资料返回。",
  "The model is slow or unavailable; read-only results and source summaries are shown instead. ",
  "Some retrieval capabilities are unavailable; results use currently available content.",
];

function publicMessage(message) {
  let text = String(message || "");
  for (const notice of LEGACY_NOTICES) text = text.replaceAll(notice, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function publicResult(result) {
  const { retrieval, constraints, ...content } = result;
  return { ...content, message: publicMessage(result.message) };
}

module.exports = { publicMessage, publicResult };
