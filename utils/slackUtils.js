const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Send a clean, text-only failure alert to Slack via Incoming Webhook.
 * Contains NO logos, NO images — 100% native, real text fields.
 */
async function sendSlackFailureAlert({
  campaignId,
  campaignName,
  url,
  viewport = 'desktop',
  error,
  leadId,
  timestamp
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.trim().startsWith('https://hooks.slack.com/')) {
    return; // Silently skip if Slack webhook is not configured
  }

  const timeStr = timestamp || new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const displayBrand = campaignName || campaignId?.toUpperCase() || 'Unknown Campaign';
  const displayError = (error || 'Execution failure or verification error').toString().trim().substring(0, 1000);

  // Clean, realistic Slack alert layout (NO logos, NO images, NO red colors)
  const payload = {
    text: `FLM Automation Alert: Campaign Failed - ${displayBrand}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `FLM Automation Alert: Campaign Failed`,
          emoji: false
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Campaign:*\n${displayBrand} (${campaignId || 'N/A'})`
          },
          {
            type: 'mrkdwn',
            text: `*Device / Environment:*\n${viewport || 'desktop'}`
          },
          {
            type: 'mrkdwn',
            text: `*Target URL:*\n${url ? `<${url}|${url}>` : 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*Lead ID:*\n${leadId && leadId !== '—' ? leadId : 'N/A'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Failure Reason:*\n\`\`\`${displayError}\`\`\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `FLM URL Automation Monitor | ${timeStr} IST`
          }
        ]
      }
    ]
  };

  try {
    await axios.post(webhookUrl.trim(), payload, { timeout: 6000 });
    console.log(`📣 [Slack Alert] Real-time failure notification sent to Slack for ${displayBrand}`);
  } catch (err) {
    console.error(`⚠️ [Slack Alert] Failed to post to Slack:`, err.message);
  }
}

module.exports = {
  sendSlackFailureAlert
};
