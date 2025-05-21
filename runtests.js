process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

const parsePriorityTests = require('./test/parse-priority.js');
const hasMongoProtocolTests = require('./test/has-mongo-protocol.js');

try {
  parsePriorityTests();
  hasMongoProtocolTests();
  console.log('All tests passed');
} catch (err) {
  console.error('Tests failed');
  console.error(err);
  process.exitCode = 1;
}

