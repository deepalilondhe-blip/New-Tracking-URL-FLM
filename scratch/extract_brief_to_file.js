const fs = require('fs');
const readline = require('readline');
const path = require('path');

const transcriptPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\6ef47344-f97c-4fca-b16d-a90dc342f0d7\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'globewest_brief.txt');

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
        fs.writeFileSync(outputPath, obj.content);
        console.log(`Successfully wrote brief to ${outputPath}`);
        break;
      }
    } catch (e) {
      // Ignore
    }
  }
})();
