const { exec } = require('child_process');
const path = require('path');

// getDay(): 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
const today = new Date();
const dayOfWeek = today.getDay();

let device = '';
let browser = '';
let dayName = '';

// Parse arguments (e.g. node ccpa-scheduler.js --day=wednesday)
const args = {};
process.argv.slice(2).forEach(val => {
  const parts = val.split('=');
  if (parts[0].startsWith('--')) {
    const key = parts[0].substring(2).toLowerCase();
    args[key] = parts[1] ? parts[1].toLowerCase() : true;
  }
});

let selectedDay = dayOfWeek;
if (args.day) {
  if (args.day === 'monday' || args.day === 'mon') selectedDay = 1;
  else if (args.day === 'wednesday' || args.day === 'wed') selectedDay = 3;
  else if (args.day === 'friday' || args.day === 'fri') selectedDay = 5;
}

if (selectedDay === 1) {
  dayName = 'Monday';
  device = 'windows';
  browser = 'chrome';
} else if (selectedDay === 3) {
  dayName = 'Wednesday';
  device = 'android';
  browser = 'chrome';
} else if (selectedDay === 5) {
  dayName = 'Friday';
  device = 'ios';
  browser = 'safari';
} else {
  // If run on a non-scheduled day, default to Windows Chrome
  dayName = `Non-scheduled day (Defaulting to Windows Chrome)`;
  device = 'windows';
  browser = 'chrome';
}

console.log(`⏰ [${new Date().toLocaleString()}] CCPA Local Scheduler`);
console.log(`📅 Day context: ${dayName}`);
console.log(`📱 Running command: node ccpa-process-all.js --device=${device} --browser=${browser}`);
console.log(`----------------------------------------------------------------`);

const runnerScript = path.join(__dirname, 'ccpa-process-all.js');
const child = exec(`node "${runnerScript}" --device=${device} --browser=${browser}`, { cwd: __dirname });

child.stdout.on('data', data => process.stdout.write(data));
child.stderr.on('data', data => process.stderr.write(data));

child.on('close', code => {
  console.log(`\n================================================================`);
  if (code === 0) {
    console.log(`✅ [${new Date().toLocaleString()}] CCPA Scheduled run finished successfully!`);
  } else {
    console.log(`❌ [${new Date().toLocaleString()}] CCPA Scheduled run completed with errors (Exit Code: ${code})`);
  }
  console.log(`================================================================`);
  process.exit(code);
});
