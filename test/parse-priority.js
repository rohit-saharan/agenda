const assert = require("assert");
const { parsePriority } = require("../dist/utils/parse-priority");
const JobPriority = {
  highest: 20,
  high: 10,
  normal: 0,
  low: -10,
  lowest: -20,
};

module.exports = function () {
  assert.strictEqual(parsePriority(5), 5);

  assert.strictEqual(parsePriority("highest"), JobPriority.highest);
  assert.strictEqual(parsePriority("high"), JobPriority.high);
  assert.strictEqual(parsePriority("normal"), JobPriority.normal);
  assert.strictEqual(parsePriority("low"), JobPriority.low);
  assert.strictEqual(parsePriority("lowest"), JobPriority.lowest);

  assert.strictEqual(parsePriority("bogus"), JobPriority.normal);
};

if (require.main === module) {
  module.exports();
  console.log("parse-priority tests passed");
}
