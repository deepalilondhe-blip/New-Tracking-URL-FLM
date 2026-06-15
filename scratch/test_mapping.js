const fs = require('fs');
const path = require('path');

// 1. Load mapToRange from utils/leadProcessor.js
const leadProcessorContent = fs.readFileSync(path.join(__dirname, '..', 'utils', 'leadProcessor.js'), 'utf8');

// Extract the mapToRange function body dynamically
const mapToRangeMatch = leadProcessorContent.match(/function mapToRange\([\s\S]*?\n\s*\}/);
if (!mapToRangeMatch) {
    console.error("❌ Could not find mapToRange function in leadProcessor.js");
    process.exit(1);
}

// Evaluate mapToRange in local scope
const mapToRange = new Function('numVal', mapToRangeMatch[0] + '\nreturn mapToRange(numVal);');

// 2. Load validateIncomeMapping from utils/flmAgent.js
const flmAgentClass = require('../utils/flmAgent');
const flmAgent = new flmAgentClass();

// Test cases
const testCases = [
    { input: 8000, expected: '5,000', expectedCake: '5000' },
    { input: 12000, expected: '10,000', expectedCake: '10000' },
    { input: 33000, expected: '5,000', expectedCake: '50000' }, // Wait, input 33000 should expect '50,000'!
    { input: 50000, expected: '100,000', expectedCake: '100000' },
    { input: 75000, expected: '100,000', expectedCake: '100000' },
    { input: 1200000, expected: '100,000', expectedCake: '100000' }
];

// Correcting testCases for 33000:
testCases[2].expected = '50,000';

console.log("=== Testing leadProcessor mapToRange ===");
let passed = true;
testCases.forEach(tc => {
    const actual = mapToRange(tc.input);
    if (actual === tc.expected) {
        console.log(`✅ Input: ${tc.input.toLocaleString()} -> ${actual} (Matches expected)`);
    } else {
        console.log(`❌ Input: ${tc.input.toLocaleString()} -> Actual: ${actual}, Expected: ${tc.expected}`);
        passed = false;
    }
});

console.log("\n=== Testing flmAgent validateIncomeMapping ===");
testCases.forEach(tc => {
    const validation = flmAgent.validateIncomeMapping(tc.input, tc.expected, tc.expectedCake, 'test-brand');
    // validateIncomeMapping returns { status, expected, actualApi, details }
    const actual = validation.expected;
    if (actual === tc.expectedCake) {
        console.log(`✅ Input: ${tc.input.toLocaleString()} -> ${actual} (Matches expectedCake)`);
    } else {
        console.log(`❌ Input: ${tc.input.toLocaleString()} -> Actual: ${actual}, Expected: ${tc.expectedCake}`);
        passed = false;
    }
});

if (passed) {
    console.log("\n🎉 ALL LOCAL TESTS PASSED!");
} else {
    console.log("\n❌ SOME TESTS FAILED!");
    process.exit(1);
}
