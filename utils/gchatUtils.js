const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Send a clean, structured failure alert to Google Chat via Incoming Webhook.
 * Uses Google Chat Cards v2 format with native styling.
 */
async function sendGChatFailureAlert({
  campaignId,
  campaignName,
  url,
  viewport = 'desktop',
  error,
  leadId,
  timestamp
}) {
  const webhookUrl = process.env.GCHAT_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.trim().startsWith('https://chat.googleapis.com/')) {
    return; // Silently skip if Google Chat webhook is not configured
  }

  const timeStr = timestamp || new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const displayBrand = campaignName || campaignId?.toUpperCase() || 'Unknown Campaign';
  const displayError = (error || 'Execution failure or verification error')
    .toString()
    .trim()
    .substring(0, 1000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const payload = {
    cardsV2: [
      {
        cardId: `alert-${Date.now()}`,
        card: {
          header: {
            title: 'FLM Automation Alert: Campaign Failed',
            subtitle: `${displayBrand}`
          },
          sections: [
            {
              widgets: [
                {
                  decoratedText: {
                    topLabel: 'Campaign',
                    text: `<b>${displayBrand}</b> (${campaignId || 'N/A'})`
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Device / Environment',
                    text: `${viewport || 'desktop'}`
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Target URL',
                    text: url ? `<a href="${url}">${url}</a>` : 'N/A'
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Lead ID',
                    text: `${leadId && leadId !== '—' ? leadId : 'N/A'}`
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Failure Reason',
                    text: `<font color="#d93025"><b>${displayError}</b></font>`
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Timestamp',
                    text: `${timeStr} IST`
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };

  try {
    await axios.post(webhookUrl.trim(), payload, { timeout: 6000 });
    console.log(`📣 [GChat Alert] Real-time failure notification sent to Google Chat for ${displayBrand}`);
  } catch (err) {
    console.error(`⚠️ [GChat Alert] Failed to post to Google Chat:`, err.response?.data || err.message);
  }
}

module.exports = {
  sendGChatFailureAlert
};
