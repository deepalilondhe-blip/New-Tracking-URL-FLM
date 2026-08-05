const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\051ad8c7-856b-4bd2-8827-df0d323ce5d5\\.system_generated\\logs\\transcript.jsonl';

(async () => {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('🔍 Searching transcript for "vpn"...');
  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.toLowerCase().includes('vpn') || line.toLowerCase().includes('veepn')) {
      const obj = JSON.parse(line);
      console.log(`\n--- Line ${lineCount} (Type: ${obj.type}, Source: ${obj.source}) ---`);
      if (obj.content) {
        console.log(obj.content.slice(0, 1000));
      } else if (obj.tool_calls) {
        console.log(JSON.stringify(obj.tool_calls, null, 2));
      }
    }
  }
})();
