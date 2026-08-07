const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function authenticate() {
  let keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || 'service_account.json';
  if (!path.isAbsolute(keyPath)) {
    keyPath = path.resolve(__dirname, '..', keyPath);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  return auth.getClient();
}

async function run() {
  console.log('📡 Authenticating and querying Google Drive for folders...');
  const client = await authenticate();
  const drive = google.drive({ version: 'v3', auth: client });

  try {
    const response = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name, owners, parents)',
      spaces: 'drive'
    });

    const folders = response.data.files || [];
    console.log(`🔍 Found ${folders.length} accessible folders:`);
    folders.forEach(f => {
      console.log(`📁 Folder Name: "${f.name}" | ID: ${f.id}`);
    });
  } catch (err) {
    console.error('❌ Failed to list shared folders:', err.message);
  }
}

run();
