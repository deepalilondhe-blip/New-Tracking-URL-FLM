const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'FLM_Project_Workflow_Export.json');
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const workflow = Array.isArray(data) ? data[0] : data;

if (workflow && workflow.nodes) {
  const executeCommandNode = workflow.nodes.find(n => n.name === 'Execute Command' || n.type === 'n8n-nodes-base.executeCommand');
  if (executeCommandNode) {
    console.log(`Original Command: ${executeCommandNode.parameters.command}`);
    // Update the command to run the full scheduler in headless mode
    executeCommandNode.parameters.command = 'node scheduler.js --once --headless';
    console.log(`Updated Command: ${executeCommandNode.parameters.command}`);
  } else {
    console.error('Execute Command node not found in workflow JSON.');
    process.exit(1);
  }
} else {
  console.error('Invalid workflow structure.');
  process.exit(1);
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Workflow JSON updated successfully!');
