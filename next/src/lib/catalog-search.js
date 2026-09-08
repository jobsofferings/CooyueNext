function normalizeText(value) {
  if (typeof value !== 'string') return ''
  return value.normalize('NFKC').toLowerCase().trim().replace(/(\d)\s*[x×*]\s*(?=\d)/g, '$1x')
}

function tokenizeKeywords(keywords) {
  return [...new Set(normalizeText(keywords).split(/[\s,，;；、|/]+/).filter(Boolean))]
}

function scoreField(field, token, weight) {
  if (!field || !token) return 0
  if (field === token) return weight * 4
  if (field.startsWith(token)) return weight * 3
  if (field.includes(token)) return weight * 2
  return 0
}

function scoreProduct(product, tokens) {
  let score = 0
  for (const token of tokens) {
    let tokenScore = 0
    for (const field of product.fields) {
      tokenScore = Math.max(tokenScore, scoreField(normalizeText(field.value), token, field.weight))
    }
    if (tokenScore === 0) return 0
    score += tokenScore
  }
  return score + tokens.length * 12
}

function searchProducts(products, keywords) {
  const tokens = tokenizeKeywords(keywords)
  if (!tokens.length) return []
  return products
    .map(product => ({ product, score: scoreProduct(product, tokens) }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.product.order - right.product.order || left.product.model.localeCompare(right.product.model))
}

module.exports = { normalizeText, tokenizeKeywords, searchProducts }
