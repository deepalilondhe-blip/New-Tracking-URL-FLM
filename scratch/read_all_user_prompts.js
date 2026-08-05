const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\051ad8c7-856b-4bd2-8827-df0d323ce5d5\\.system_generated\\logs\\transcript.jsonl';

(async () => {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('📋 Listing all user prompts from transcript...');
  let count = 0;
  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.type === 'USER_INPUT') {
      count++;
      console.log(`\n[Prompt ${count}]`);
      console.log(obj.content);
    }
  }
})();
