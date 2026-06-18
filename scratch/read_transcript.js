const fs = require('fs');
const readline = require('readline');
const path = require('path');

const transcriptPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\6ef47344-f97c-4fca-b16d-a90dc342f0d7\\.system_generated\\logs\\transcript.jsonl';

(async () => {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        console.log(`[USER_INPUT] Index: ${obj.step_index}, Content: ${obj.content}`);
        count++;
      }
      if (obj.type === 'PLANNER_RESPONSE') {
        console.log(`[PLANNER_RESPONSE] Index: ${obj.step_index}, Preview: ${obj.content.substring(0, 150)}...`);
        count++;
      }
      if (count > 50) break;
    } catch (e) {
      // Ignore parse errors
    }
  }
})();
