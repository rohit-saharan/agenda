const assert = require("assert");
const { hasMongoProtocol } = require("../dist/agenda/has-mongo-protocol");

module.exports = function () {
  assert.strictEqual(
    hasMongoProtocol("mongodb://localhost:27017/test"),
    true
  );
  assert.strictEqual(
    hasMongoProtocol("mongodb+srv://user@cluster/test"),
    true
  );
  assert.strictEqual(hasMongoProtocol("http://localhost"), false);
};

if (require.main === module) {
  module.exports();
  console.log("has-mongo-protocol tests passed");
}
