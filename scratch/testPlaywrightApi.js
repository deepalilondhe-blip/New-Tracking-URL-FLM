const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const apiRequest = context.request;

    try {
        console.log('📡 Attempting Second API via Playwright APIRequestContext...');
        const response = await apiRequest.post('https://flm-utility.com/api-qa-automation-hostgator/getData.php', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            form: {
                cake_id: '2D10BBA1',
                domain_name: 'https://fidelity-tax-defense.net/'
            }
        });

        console.log('✅ Response Status:', response.status());
        const text = await response.text();
        console.log('✅ Response Body:', text);
    } catch (e) {
        console.error('❌ Failed:', e.message);
    } finally {
        await browser.close();
    }
})();
