const fs = require('fs');
const readline = require('readline');
const path = require('path');

const brainDir = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain';

async function searchTranscript(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT' && obj.content.includes('GlobeWest') && obj.content.length > 5000) {
        console.log(`=== FOUND LARGE INPUT IN ${filePath} ===`);
        console.log(`Length: ${obj.content.length}`);
        const outPath = path.join(__dirname, 'globewest_full_brief.txt');
        fs.writeFileSync(outPath, obj.content);
        console.log(`Wrote full brief to ${outPath}`);
        return true;
      }
    } catch (e) {
      // Ignore
    }
  }
  return false;
}

(async () => {
  const dirs = fs.readdirSync(brainDir);
  for (const dir of dirs) {
    const transcriptPath = path.join(brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
    if (fs.existsSync(transcriptPath)) {
      console.log(`Searching transcript: ${transcriptPath}`);
      const found = await searchTranscript(transcriptPath);
      if (found) break;
    }
  }
})();
