const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'campaigns.json');
const campaigns = JSON.parse(fs.readFileSync(configPath, 'utf8'));

let content = `================================================================================
🚀 LEADS AUTOMATION - UNIFIED MANUAL RUN GUIDE
================================================================================

This guide contains the exact commands to run any of the automated tracking campaigns
manually using the unified orchestrator script ('run-master.js'). This orchestrator
fully enforces all strict test credentials, rotating dummy phone numbers, rotating
slider debt selections, dynamic states, and automatic Google Sheets persistence.

--------------------------------------------------------------------------------
📌 UNIFIED COMMAND TEMPLATE
--------------------------------------------------------------------------------

To manually run any campaign, use the following template structure:

  👉 node run-master.js --campaign <campaign-id> --viewport <desktop|tablet|mobile>

💡 MANUALLY RUNNING VISIBILITY:
   By default, all manual terminal commands listed below will launch a VISIBLE browser window on your screen
   with a slight delay so you can easily watch the dynamic questionnaire actions, inputs, and state selections!

   *Note: The automatic 2-hour scheduler (or '--once' run) continues to run fast and invisibly in the background.

--------------------------------------------------------------------------------
📋 CAMPAIGN-SPECIFIC RUN COMMANDS (ALL ${campaigns.length} ACTIVE CAMPAIGNS)
--------------------------------------------------------------------------------

`;

campaigns.forEach((c, index) => {
  content += `${index + 1}. 📊 ${c.name} (${c.id})\n`;
  content += `   🔹 Desktop: node run-master.js --campaign ${c.id} --viewport desktop --headed\n`;
  content += `   🔹 Tablet:  node run-master.js --campaign ${c.id} --viewport tablet --headed\n`;
  content += `   🔹 Mobile:  node run-master.js --campaign ${c.id} --viewport mobile --headed\n\n`;
});

content += `--------------------------------------------------------------------------------
🔄 RECURRING BATCH SCHEDULER (HEADED MODE - VISIBLE BROWSER)
--------------------------------------------------------------------------------

The scheduler runs campaigns sequentially. By default, it runs them in headless mode
for automated scheduling, but you can override it.

Start the scheduler (runs every 2 hours, headless/background by default):
  👉 node scheduler.js

Run all campaigns once immediately (headless/background):
  👉 node scheduler.js --once --headless

Run all campaigns once immediately (headed/visible browser):
  👉 node scheduler.js --once

⏰ TIMING: The scheduler runs IMMEDIATELY on start, then repeats every 2 hours.
   Example: If started at 10:00 AM → next runs at 12:00 PM, 2:00 PM, 4:00 PM...
   The terminal will always show: "Next automation batch will start at: [time]"

================================================================================
🎥 ACCESS RECORDED VIDEOS & PLOT TRACES
================================================================================

All manual and scheduled executions automatically record a visual video and trace file!

* Videos:  traces/videos/  (Can be opened in Chrome/Edge, e.g., PPC_PPC.webm)
* Traces:  traces/         (Zip logs, timeline view: 'npx playwright show-trace traces/<campaign_viewport>.zip')

================================================================================
Spreadsheet: https://docs.google.com/spreadsheets/d/1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI/edit#gid=1177143742
================================================================================

--------------------------------------------------------------------------------
🧪 FLM AGENT – LEAD & IP VALIDATION COMMANDS
--------------------------------------------------------------------------------

Run the latest lead validation script (headed browser):

  👉 node utils/flmAgent/validate_latest_lead.js
  👉 npm run flm:validate-lead
  
Run the "Test Only" IP validation script (headed browser):

  👉 node utils/flmAgent/test_only_ip_validation.js
`;

fs.writeFileSync(path.join(__dirname, '..', 'Run Commands.txt'), content, 'utf8');
console.log('✅ Run Commands.txt generated successfully!');
