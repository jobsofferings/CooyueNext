const { analyzeQuery } = require("../knowledge/retriever");

function literalPattern(value, suffix = "(?![a-z0-9])") {
  return new RegExp(`(?<![a-z0-9])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${suffix}`, "i");
}

function hardConditions(query, items = []) {
  const text = String(query || "").normalize("NFKC");
  const intent = analyzeQuery(text);
  const models = [...new Set(text.toLowerCase().match(/\b[a-z]{1,10}[-]?\d+[a-z0-9-]*\b/g) || [])]
    .filter((model) => !["sf6", "ch4", "co2", "h2", "o2", "nh3", "c2h4"].includes(model));
  const products = items.filter((item) => item.type === "product");
  const series = [...new Set(text.toLowerCase().match(/\b[a-z]{2,10}\b/g) || [])]
    .filter((prefix) => products.some((item) => literalPattern(prefix, "-?\\d").test(`${item.card.model} ${item.card.name}`)));
  const categories = [...new Set(products.filter((item) => item.card.categoryName
    && text.toLowerCase().includes(item.card.categoryName.toLowerCase())).map((item) => item.card.category))];
  const unknownGas = /氢气|二氧化碳|氧气|一氧化碳|硫化氢|乙烷|丙烷|丁烷|\bhydrogen\b|carbon dioxide|\bethane\b|\bpropane\b/i.test(text);
  const withoutResolutions = intent.resolutions.reduce((remaining, resolution) => remaining.replace(resolution.label, ""), text);
  const unsafe = /排除|不要|不需要|不包括|低于|高于|以内|以上|以下|至少|至多|同一配置|同时检测|防爆|认证|\bcertified\b|\bwithout\b|\bexcluding\b|\bunder\b|\bover\b|\bnot\b|[<>≤≥]/i.test(withoutResolutions);
  const ambiguous = Boolean(intent.clarification) || /(?:气体|目标).*\?|\bunknown gas\b/.test(text);
  return { matched: intent.matched.map(({ key, kind }) => ({ key, kind })), resolutions: intent.resolutions, cooling: intent.cooling,
    models, series, categories, ambiguous, restricted: unknownGas || unsafe, blocked: unknownGas || unsafe || ambiguous };
}

function currentRequest(message) {
  return message.trim().replace(/^(?:请|先)?(?:放弃|不要|不看|别看)(?:这|那|前面|刚才|之前|上面)(?:些|几|一|个|款|的)*(?:产品|设备|候选|结果)(?:了)?[\s，,。；;！!]*/i, "")
    .replace(/^(?:forget|discard|ignore)\s+(?:these|those|previous)\s+(?:products|results|candidates)[\s,.;!]*/i, "")
    .replace(/^(?:请)?(?:重新搜索|重新查询|新的搜索|新话题|new search|new topic|start over)[\s，,:：]*/i, "").trim();
}

function interpret(message, previousQuery, requestedIntent, items = []) {
  const text = currentRequest(message);
  const current = hardConditions(text, items);
  const previous = { ...hardConditions(""), ...(typeof previousQuery === "object" && previousQuery ? previousQuery : hardConditions(previousQuery, items)) };
  const replaces = /换成|换为|改成|改为|改用|instead|change|switch|rather than/i.test(text);
  const resolvesGas = previous.ambiguous && current.matched.some((condition) => condition.kind === "gas");
  const followup = /这些|上述|其中|它们|这款|那款|这几个|同样|仍然|还是|只要|只看|筛选|继续|再加|其他候选|条件不变|\b(?:these|those|them|only|still|also|among|other candidates)\b/i.test(text);
  const withinResults = /(?:这些|上述|它们|这几个)(?:产品|候选)?(?:中|里|里面)|其中|条件不变|\bamong\b/i.test(text);
  const namedTarget = current.models.length || current.series.length || current.categories.length;
  const application = current.matched.some((condition) => condition.kind === "gas") && /巡检|检测|监测|设备|相机|\b(?:inspection|detection|monitoring|devices?|cameras?)\b/i.test(text);
  const attributeOnly = !namedTarget && !current.matched.some((condition) => condition.kind === "gas")
    && (current.matched.length || current.resolutions.length || current.cooling.length || /至少|至多|以下|以上|不超过|不要|排除|\b(?:at least|at most|without|excluding)\b/i.test(text));
  let mode = "new_search";
  let reason = "standalone_request";
  if (text !== message.trim()) reason = "explicit_new_search";
  else if (!previousQuery) reason = "first_request";
  else if (withinResults || resolvesGas || attributeOnly || (replaces && !namedTarget)) { mode = "refine"; reason = resolvesGas ? "clarification_answer" : "explicit_refinement"; }
  else if ((namedTarget || application) && !followup) reason = "new_named_target";
  else if (requestedIntent) { mode = requestedIntent; reason = "model_intent"; }
  else if (followup) { mode = "refine"; reason = "context_reference"; }
  const inherit = mode === "refine";
  const replacedKinds = new Set(replaces ? current.matched.map((condition) => condition.kind) : []);
  const matched = [...new Map([...(inherit ? previous.matched.filter((condition) => !replacedKinds.has(condition.kind)) : []), ...current.matched]
    .map((condition) => [`${condition.kind}:${condition.key}`, condition])).values()];
  const retain = (field) => current[field].length ? current[field] : inherit ? previous[field] : [];
  const ambiguous = current.ambiguous || (inherit && previous.ambiguous && !resolvesGas);
  const restricted = current.restricted || (inherit && previous.restricted);
  const conditions = { matched, resolutions: retain("resolutions"), cooling: retain("cooling"),
    models: current.series.length ? [] : retain("models"), series: current.models.length ? [] : retain("series"), categories: retain("categories"),
    ambiguous, restricted, blocked: ambiguous || restricted || (inherit && previous.blocked && !resolvesGas) };
  return { text, current, conditions, mode, reason, replaces, resolvesGas };
}

function mergeConditions(_query, message, previousQuery, options = {}) {
  return interpret(message, previousQuery, options.intent, options.items).conditions;
}

function resolveSearch({ input, message, previousQuery, previousConditions, items }) {
  const decision = interpret(message, previousConditions || previousQuery, input.intent, items);
  const { conditions } = decision;
  const planned = hardConditions(input.query, items);
  const ungrounded = planned.matched.some((condition) => !conditions.matched.some((active) => active.key === condition.key && active.kind === condition.kind))
    || ["models", "series", "categories", "cooling"].some((field) => planned[field].some((value) => !conditions[field].includes(value)))
    || planned.resolutions.some((value) => !conditions.resolutions.some((active) => active.width === value.width && active.height === value.height && active.operator === value.operator))
    || (planned.blocked && !conditions.blocked);
  const queryRepaired = ungrounded || decision.text !== message.trim();
  const inheritedText = decision.mode === "refine" && !decision.replaces && !decision.resolvesGas && typeof previousQuery === "string" ? previousQuery : "";
  const baseQuery = [queryRepaired ? decision.text : input.query, inheritedText].filter(Boolean).join(" ");
  const included = hardConditions(baseQuery, items);
  const categoryNames = conditions.categories.filter((category) => !included.categories.includes(category))
    .map((category) => items.find((item) => item.card.category === category)?.card.categoryName || category);
  const query = [...new Set([baseQuery,
    ...conditions.matched.filter((condition) => !included.matched.some((entry) => entry.key === condition.key)).map((condition) => condition.key),
    ...conditions.models.filter((model) => !included.models.includes(model)), ...conditions.series.filter((prefix) => !included.series.includes(prefix)), ...categoryNames,
    ...conditions.resolutions.filter((resolution) => !included.resolutions.some((entry) => entry.width === resolution.width && entry.height === resolution.height && entry.operator === resolution.operator)).map((resolution) => resolution.label),
    ...conditions.cooling.filter((cooling) => !included.cooling.includes(cooling))].filter(Boolean))].join(" ").slice(0, 1000);
  return { query, conditions, intent: { mode: decision.mode, reason: decision.reason, requested: input.intent || null, queryRepaired } };
}

module.exports = { hardConditions, literalPattern, mergeConditions, resolveSearch };
