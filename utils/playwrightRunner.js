const { firefox, chromium, webkit } = require('playwright');

/**
 * Launch a Playwright browser based on the requested mode.
 * Currently supports Firefox for visible runs. Can be extended to other browsers.
 *
 * @param {Object} options
 * @param {boolean} options.headed - If true, launch in headed (visible) mode.
 * @returns {Promise<import('playwright').Browser>} The launched browser instance.
 */
async function launchPlaywright({ headed = false } = {}) {
  // For now we use Firefox as the default. Adjust as needed.
  const launchOptions = { headless: !headed };
  const browser = await firefox.launch(launchOptions);
  return browser;
}

module.exports = { launchPlaywright };
