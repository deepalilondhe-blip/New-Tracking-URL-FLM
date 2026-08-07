const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
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
  const zipPath = path.resolve(__dirname, '..', 'New_Tracking_URL_Backup.zip');
  
  console.log('📦 Creating ZIP archive of the project folder (excluding node_modules, traces, .git, .vscode, and playwright-report)...');
  try {
    // Run PowerShell Compress-Archive command
    const psCommand = `powershell -Command "Get-ChildItem -Path . -Exclude 'node_modules', '.git', '.vscode', 'traces', 'playwright-report', 'New_Tracking_URL_Backup.zip' | Compress-Archive -DestinationPath 'New_Tracking_URL_Backup.zip' -Force"`;
    execSync(psCommand, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    console.log('✅ ZIP archive created successfully!');
  } catch (err) {
    console.error('❌ Failed to create ZIP archive:', err.message);
    process.exit(1);
  }

  console.log('📡 Authenticating with Google API...');
  const client = await authenticate();
  const drive = google.drive({ version: 'v3', auth: client });

  console.log('📤 Uploading ZIP archive to Google Drive...');
  try {
    const fileMetadata = {
      name: `New_Tracking_URL_Backup_${new Date().toISOString().replace(/:/g, '-')}.zip`,
      parents: ['19u_xb7gnD148oErzyAnmt8EH4vXBLT_M']
    };
    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(zipPath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log('✨ File uploaded successfully!');
    console.log(`📄 File Name: ${response.data.name}`);
    console.log(`🆔 File ID: ${response.data.id}`);
    console.log(`🔗 Link: ${response.data.webViewLink}`);
    
    // Permissively share the file with the email so that the owner has access
    try {
      console.log('👤 Granting read access to deepali.londhe@magnetoitsolutions.com...');
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'user',
          emailAddress: 'deepali.londhe@magnetoitsolutions.com'
        }
      });
      console.log('✅ Access granted successfully!');
    } catch (shareErr) {
      console.warn(`⚠️ Could not share file directly: ${shareErr.message}`);
    }

    console.log('Cleanup: Removing local ZIP archive...');
    fs.unlinkSync(zipPath);
    console.log('✅ Local cleanup finished!');
  } catch (err) {
    console.error('❌ Failed to upload to Google Drive:', err.message);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  }
}

run();
