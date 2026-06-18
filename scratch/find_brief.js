const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\6ef47344-f97c-4fca-b16d-a90dc342f0d7\\.system_generated\\logs\\transcript.jsonl';

(async () => {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT' && obj.content.includes('GlobeWest')) {
        console.log('=== FOUND USER INPUT ===');
        console.log(obj.content);
        console.log('========================');
      }
    } catch (e) {
      // Ignore
    }
  }
})();
