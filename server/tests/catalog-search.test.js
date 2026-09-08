const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeText, tokenizeKeywords, searchProducts } = require("../../next/src/lib/catalog-search");

const product = (id, fields, order = 0) => ({
  id, model: id, order, fields: fields.map((value) => ({ value, weight: 20 })),
});

test("catalog requires every condition on the same product, across its fields", () => {
  const products = [
    product("methane-only", ["甲烷", "固定式", "320 × 256"]),
    product("handheld-only", ["SF6", "手持", "320 × 256"]),
    product("wrong-resolution", ["甲烷", "手持", "320 × 240"]),
    product("all-conditions", ["甲烷", "手持", "320 × 256"]),
  ];
  assert.deepEqual(searchProducts(products, "甲烷 手持 320x256").map((result) => result.product.id), ["all-conditions"]);
  assert.deepEqual(searchProducts(products, "甲烷 手持 640x512"), []);
});

test("catalog normalizes resolution notation, full-width input and repeated conditions", () => {
  assert.equal(normalizeText("  ３２０ × ２５６  "), "320x256");
  assert.deepEqual(tokenizeKeywords("甲烷，手持；甲烷、320 * 256"), ["甲烷", "手持", "320x256"]);
  const products = [product("kit", ["SDI", "Ethernet", "K10"])];
  assert.equal(searchProducts(products, "sdi ETHERNET k10").length, 1);
  assert.deepEqual(searchProducts(products, "sdi ETHERNET k10 9"), []);
});

test("catalog does not treat scattered characters as a matching model or parameter", () => {
  const products = [product("unrelated", ["P thermal V optics 4 system 0 series 0"])];
  assert.deepEqual(searchProducts(products, "PV400"), []);
});

test("catalog keeps single-keyword ranking and rejects blank queries", () => {
  const products = [product("prefix", ["PV400 camera"]), product("exact", ["PV400"]), product("contains", ["Guide PV400 camera"])];
  assert.deepEqual(searchProducts(products, "pv400").map((result) => result.product.id), ["exact", "prefix", "contains"]);
  assert.deepEqual(searchProducts(products, " ， ; "), []);
});
