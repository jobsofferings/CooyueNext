const test = require("node:test");
const assert = require("node:assert/strict");
const { getCarouselFrame, ASSEMBLED_SECONDS, TRANSITION_SECONDS, MODULE_SECONDS } = require("../../next/src/components/products/imaging-kit/imaging-kit-carousel");

test("carousel presents all five modules in order while fully exploded", () => {
  for (let moduleIndex = 0; moduleIndex < 5; moduleIndex += 1) {
    const frame = getCarouselFrame(ASSEMBLED_SECONDS + TRANSITION_SECONDS + moduleIndex * MODULE_SECONDS + 1, 5);
    assert.equal(frame.moduleIndex, moduleIndex);
    assert.equal(frame.explosion, 1);
  }
});

test("carousel assembles, opens and closes without exceeding the slider range", () => {
  assert.equal(getCarouselFrame(0, 5).explosion, 0);
  assert.equal(getCarouselFrame(3, 5).explosion, 0.5);
  assert.equal(getCarouselFrame(25, 5).explosion, 0.5);
  for (let elapsed = 0; elapsed < 80; elapsed += 0.1) {
    const frame = getCarouselFrame(elapsed, 5);
    assert.ok(frame.explosion >= 0 && frame.explosion <= 1);
    assert.ok(frame.moduleIndex >= 0 && frame.moduleIndex < 5);
  }
});

test("carousel repeats complete tours rather than stopping after one playback", () => {
  const duration = getCarouselFrame(0, 5).duration;
  assert.equal(duration, 26);
  for (let cycle = 1; cycle <= 10; cycle += 1) {
    for (const offset of [0, 3, 6, 10, 14, 18, 22, 25]) {
      assert.deepEqual(getCarouselFrame(duration * cycle + offset, 5), getCarouselFrame(offset, 5));
    }
  }
});

test("carousel handles a single module and a negative initial timestamp", () => {
  assert.equal(getCarouselFrame(-5, 5).moduleIndex, 0);
  assert.equal(getCarouselFrame(-5, 5).explosion, 0);
  assert.equal(getCarouselFrame(12, 1).moduleIndex, 0);
});
