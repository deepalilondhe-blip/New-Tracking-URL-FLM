const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_FILE),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function run() {
  // Load campaigns.json
  const campaignsPath = path.join(__dirname, '../config/campaigns.json');
  const campaigns = JSON.parse(fs.readFileSync(campaignsPath, 'utf8'));

  // Load brands.js
  const brands = require('../config/brands.js');

  // Load offers sheet
  const client = await authenticate();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = '1TJYMxbyREFVIIGYIdb15SpwG0X6Kmm4nhmBS_OUE8EY';

  console.log(`Loading offers sheet for verification...`);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `offers!A2:C100`, // Skip header row
  });

  const rows = res.data.values || [];
  console.log(`Fetched ${rows.length} rows from client Google Sheet.`);

  console.log(`\n================================================================`);
  console.log(`🔍 CROSS-VERIFICATION REPORT: CONFIG vs CLIENT SPREADSHEET`);
  console.log(`================================================================\n`);

  let mismatches = 0;
  let matches = 0;

  rows.forEach((row, idx) => {
    let offer = row[0] ? row[0].trim() : '';
    let sub = row[1] ? row[1].trim() : '';
    let sheetUrl = row[2] ? row[2].trim() : '';

    if (!offer || !sheetUrl) return;

    // Build the expected campaign name
    let expectedName = offer;
    if (offer === 'tra.com') {
      expectedName = sub === 'ppcm/ca' ? 'PPCM/CA' : sub.toUpperCase();
    }

    // Try to find the campaign in campaigns.json
    let foundCampaign = campaigns.find(c => {
      // Check by URL match or by name match
      const cUrlNorm = c.url.trim().toLowerCase();
      const sUrlNorm = sheetUrl.trim().toLowerCase();
      return cUrlNorm === sUrlNorm || c.name.toLowerCase() === expectedName.toLowerCase();
    });

    console.log(`Row ${idx + 2} | Sheet: "${offer}" (${sub}) | Expected Name: "${expectedName}"`);
    if (!foundCampaign) {
      console.log(`  ❌ NOT FOUND IN CONFIG campaigns.json!`);
      console.log(`  URL in sheet: ${sheetUrl}`);
      mismatches++;
    } else {
      let isNameMatch = foundCampaign.name.toLowerCase() === expectedName.toLowerCase();
      let isUrlMatch = foundCampaign.url.trim() === sheetUrl.trim();

      if (isNameMatch && isUrlMatch) {
        console.log(`  ✅ MATCH: Name and URL match campaigns.json exactly!`);
        matches++;
      } else {
        console.log(`  ⚠️ MISMATCH:`);
        if (!isNameMatch) console.log(`    - Name in Sheet: "${expectedName}" vs Config: "${foundCampaign.name}"`);
        if (!isUrlMatch) console.log(`    - URL in Sheet: "${sheetUrl}"\n                     vs Config: "${foundCampaign.url}"`);
        mismatches++;
      }

      // Check against brands.js too
      let foundBrand = brands.find(b => b.url.trim() === sheetUrl.trim() || b.name.toLowerCase() === expectedName.toLowerCase());
      if (!foundBrand) {
        console.log(`  ❌ NOT FOUND IN CONFIG brands.js!`);
      } else {
        let isBrandNameMatch = foundBrand.name.toLowerCase() === expectedName.toLowerCase();
        let isBrandUrlMatch = foundBrand.url.trim() === sheetUrl.trim();
        let isBrandSheetMatch = foundBrand.sheet === foundCampaign.sheet;
        if (!isBrandNameMatch || !isBrandUrlMatch || !isBrandSheetMatch) {
          console.log(`  ⚠️ brands.js Sync Check:`);
          if (!isBrandNameMatch) console.log(`    - Brand Name: "${expectedName}" vs Config: "${foundBrand.name}"`);
          if (!isBrandUrlMatch) console.log(`    - Brand URL: "${sheetUrl}" vs Config: "${foundBrand.url}"`);
          if (!isBrandSheetMatch) console.log(`    - Brand Sheet: "${foundCampaign.sheet}" vs Config: "${foundBrand.sheet}"`);
        }
      }
    }
    console.log(`----------------------------------------------------------------`);
  });

  console.log(`\n================================================================`);
  console.log(`SUMMARY: ${matches} Matches, ${mismatches} Mismatches / Missing`);
  console.log(`================================================================`);
}

run().catch(console.error);
