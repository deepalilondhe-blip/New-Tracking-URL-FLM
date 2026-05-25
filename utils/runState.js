const fs = require('fs');
const path = require('path');

const historyPath = path.join(__dirname, '..', 'config', 'scheduler-run-history.json');

function getRunIndexAndIncrement(campaignId) {
  let history = {};
  
  // Ensure config directory exists
  const dir = path.dirname(historyPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) {
      console.warn('⚠️ Could not read scheduler-run-history.json, resetting:', e.message);
    }
  }
  
  const currentCount = history[campaignId] || 0;
  history[campaignId] = currentCount + 1;
  
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ Failed to write scheduler-run-history.json:', e.message);
  }
  
  return currentCount; // 0 for 1st execution, 1 for 2nd execution, 2 for 3rd execution, etc.
}

module.exports = {
  getRunIndexAndIncrement
};
