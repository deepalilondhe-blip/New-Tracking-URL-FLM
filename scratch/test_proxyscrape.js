const axios = require('axios');
const { chromium } = require('playwright-extra');

(async () => {
  console.log('Fetching USA SOCKS5 proxies from ProxyScrape...');
  try {
    const response = await axios.get('https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=ipport&format=json&country=us&protocol=socks5');
    const proxyList = response.data.proxies || [];
    console.log(`Fetched ${proxyList.length} proxies.`);
    
    if (proxyList.length === 0) {
      console.log('No proxies found.');
      return;
    }

    // Try top 10 proxies
    for (let i = 0; i < Math.min(proxyList.length, 10); i++) {
      const proxy = proxyList[i];
      const proxyUrl = `socks5://${proxy.ip}:${proxy.port}`;
      console.log(`\nTesting proxy [${i + 1}]: ${proxyUrl}`);

      let browser;
      try {
        browser = await chromium.launch({
          proxy: { server: proxyUrl },
          timeout: 10000
        });

        const context = await browser.newContext({ timeout: 15000 });
        const page = await context.newPage();

        await page.goto('https://ipinfo.io/json', { timeout: 15000 });
        const text = await page.locator('pre').innerText();
        const details = JSON.parse(text);

        console.log(`✅ Working proxy! Country: ${details.country}, IP: ${details.ip}`);
        await browser.close();
        break; // found one!
      } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        if (browser) await browser.close();
      }
    }
  } catch (err) {
    console.error('Error fetching/testing proxies:', err.message);
  }
})();
