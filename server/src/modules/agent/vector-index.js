const { readOnly } = require("./content");
const { embeddingVersion } = require("./embeddings");

function pendingVectorItems(items, stored, dimensions) {
  const byKey = new Map(stored.map((row) => [row.content_key, row]));
  return items.filter((item) => {
    const row = byKey.get(item.key);
    return !row || row.content_hash !== item.hash || !row.valid || row.dimensions !== dimensions;
  });
}

async function readVectorIndex(pool, config, locale) {
  return readOnly(pool, async (client) => (await client.query(`SELECT content_key, content_hash,
    jsonb_array_length(embedding) AS dimensions,
    (NOT jsonb_path_exists(embedding, '$[*] ? (@.type() != "number")')
      AND jsonb_path_exists(embedding, '$[*] ? (@ != 0)')) AS valid
    FROM agent.search_vectors WHERE locale = $1 AND model_version = $2`, [locale, embeddingVersion(config)])).rows);
}

async function scoreVectorIndex(pool, config, locale, vector, candidates) {
  return readOnly(pool, async (client) => (await client.query(`WITH query_vector AS (
    SELECT component.value::double precision AS value, component.position
    FROM jsonb_array_elements_text($3::jsonb) WITH ORDINALITY AS component(value, position)
  ) SELECT stored.content_key,
    sum(component.value::double precision * query_vector.value) /
      nullif(sqrt(sum(component.value::double precision ^ 2)) * sqrt(sum(query_vector.value ^ 2)), 0) AS score
    FROM agent.search_vectors stored
    JOIN jsonb_to_recordset($4::jsonb) AS requested(content_key text, content_hash text)
      ON requested.content_key = stored.content_key AND requested.content_hash = stored.content_hash
    CROSS JOIN LATERAL jsonb_array_elements_text(stored.embedding) WITH ORDINALITY AS component(value, position)
    JOIN query_vector ON query_vector.position = component.position
    WHERE stored.locale = $1 AND stored.model_version = $2
      AND jsonb_array_length(stored.embedding) = $5
    GROUP BY stored.content_key ORDER BY score DESC, stored.content_key`,
  [locale, embeddingVersion(config), JSON.stringify(vector),
    JSON.stringify(candidates.map(({ content_key, content_hash }) => ({ content_key, content_hash }))), config.dimensions])).rows);
}

module.exports = { pendingVectorItems, readVectorIndex, scoreVectorIndex };
