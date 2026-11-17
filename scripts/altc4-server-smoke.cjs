const { describeAltC4Integration } = require('../dist-server/games/altc4/server/integration-spike.js');

const result = describeAltC4Integration();
if (!result.includes('CommonJS backend')) {
  throw new Error(`Unexpected server integration result: ${result}`);
}
console.log(result);
