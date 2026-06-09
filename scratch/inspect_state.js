const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log('Navigating to landing page...');
        await page.goto('https://flm-sctr-trk.com/?a=659&oc=684&c=1818&s1=', { waitUntil: 'networkidle' });
        console.log('Current URL:', page.url());

        // Step 1: Slider
        console.log('Step 1: Clicking next button');
        const next1 = page.locator('.btn-next, .next, .step1btn, button:has-text("NEXT")').first();
        await next1.click();
        await page.waitForTimeout(1000);

        // Step 2: Debt Type
        console.log('Step 2: Selecting debt type (Federal)');
        // Click on Federal
        const federalOption = page.locator('text=Federal').first();
        if (await federalOption.isVisible()) {
            await federalOption.click();
            await page.waitForTimeout(1000);
        } else {
            console.log('Federal text not visible, clicking options...');
            await page.locator('.debt-type, .choice-btn, label').first().click();
        }

        // Click next on Step 2 if needed
        const next2 = page.locator('.btn-next, .next, .debt-type, button:has-text("NEXT")').first();
        if (await next2.isVisible()) {
            await next2.click();
            await page.waitForTimeout(1000);
        }

        console.log('Step 3: State page reached. URL:', page.url());
        // Dump the HTML of the form or the body to inspect the State element
        const bodyHtml = await page.content();
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, 'state_page.html'), bodyHtml);
        console.log('HTML saved to state_page.html');

        // Let's inspect what elements are present on the page
        const elementsInfo = await page.evaluate(() => {
            const selectEl = document.querySelector('select');
            const selectHtml = selectEl ? selectEl.outerHTML : 'No select element found';
            
            // Look for any div/span/input related to state
            const stateEl = document.querySelector('[id*="state" i], [name*="state" i], [class*="state" i]');
            const stateHtml = stateEl ? stateEl.outerHTML : 'No state element found by query';
            
            // Check for buttons
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], .btn, .btn-next, .next'));
            const buttonsHtml = buttons.map(b => b.outerHTML).join('\n');

            return { selectHtml, stateHtml, buttonsHtml };
        });

        console.log('Select element HTML:', elementsInfo.selectHtml);
        console.log('State element HTML:', elementsInfo.stateHtml);
        console.log('Buttons HTML:', elementsInfo.buttonsHtml);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
