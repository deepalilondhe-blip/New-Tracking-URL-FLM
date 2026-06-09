require('dotenv').config();
const aiAgent = require('../utils/flmAgent');

/**
 * =========================================================
 * MOBILE FORM PAGE PATTERN (iPhone / Android Emulation)
 * =========================================================
 * Dedicated Page Object Model for mobile form interactions.
 * Fully separated from Desktop class to ensure ease of reading, 
 * specialized viewport element interaction, and custom event 
 * dispatching on responsive touch layouts.
 */
class MobileFormPage {
  constructor(page) {
    this.page = page;
    this.originalUrl = null;
    this.step1 = '';
    this.step2 = '';
    this.step3 = '';
    this.step4 = '';
    this.step5 = '';
    this.step6 = '';
    this.step7 = '';
    this.step8 = '';
    this.step9 = '';
    this.step10 = '';
    this.selectedSliderAmount = '';
    this.clickedChoiceTexts = new Set();
  }

  /**
   * Helper to retrieve the visible step/question header text of the current page step.
   */
  async getVisibleStepHeader() {
    try {
      return await this.page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .step-title, .form-title, .section-title, .title, .heading, .question-title, p.title, label.title'));
        for (const h of headings) {
          const style = window.getComputedStyle(h);
          if (style.display !== 'none' && style.visibility !== 'hidden' && h.offsetWidth > 0 && h.offsetHeight > 0) {
            const text = h.textContent.trim().replace(/\s+/g, ' ');
            if (text && text.length > 3 && !text.toLowerCase().includes('tax relief advocates') && !text.toLowerCase().includes('tra')) {
              return text;
            }
          }
        }
        return '';
      });
    } catch (e) {
      return '';
    }
  }

  /**
   * Inject high-fidelity glossy brushed Natural Titanium iPhone 17 Pro mockup frame.
   * Renders realistic bezel, rounded corners, Dynamic Island, status bar, and home indicator.
   */
  async injectIPhoneFrame() {
    console.log('📱 [Mobile] Injecting high-fidelity glossy Natural Titanium iPhone 17 Pro mockup frame...');
    try {
      await this.page.evaluate(() => {
        if (document.getElementById('iphone-bezel-wrapper')) return;

        // Bezel and Status Overlays Container
        const wrapper = document.createElement('div');
        wrapper.id = 'iphone-bezel-wrapper';
        wrapper.innerHTML = `
          <!-- Premium Pink Titanium Device Frame Bezel Overlay -->
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            border: 14px solid #ff69b4; /* Pink Titanium Brushed Finish */
            border-radius: 46px;
            box-sizing: border-box;
            pointer-events: none;
            z-index: 99999999;
            box-shadow: inset 0 0 12px rgba(0,0,0,0.85), 0 0 25px rgba(255,105,180,0.5);
          "></div>
          
          <!-- Screen Glass Border Reflection -->
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 44px;
            box-sizing: border-box;
            pointer-events: none;
            z-index: 100000000;
          "></div>

          <!-- Dynamic Island -->
          <div style="
            position: fixed;
            top: 14px;
            left: 50%;
            transform: translateX(-50%);
            width: 115px;
            height: 30px;
            background-color: #000000;
            border-radius: 20px;
            z-index: 100000001;
            pointer-events: none;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4), inset 0 0 3px rgba(255,255,255,0.15);
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 0 10px;
            box-sizing: border-box;
          ">
            <div style="width: 5px; height: 5px; background-color: #1a1e29; border-radius: 50%; box-shadow: inset 0 0 2px #000;"></div>
            <div style="width: 12px; height: 12px; background-color: #000; border-radius: 50%;"></div>
            <div style="width: 6px; height: 6px; background-color: #0d121c; border-radius: 50%;"></div>
          </div>

          <!-- iOS Status Bar -->
          <div style="
            position: fixed;
            top: 15px;
            left: 0;
            width: 100vw;
            padding: 0 36px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: #1a1a1a;
            z-index: 100000001;
            pointer-events: none;
            box-sizing: border-box;
          ">
            <!-- Left Side: Time -->
            <div>9:41</div>
            
            <!-- Right Side: Signal, WiFi, Battery -->
            <div style="display: flex; align-items: center; gap: 5px;">
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
                <rect x="0" y="8" width="2" height="3" rx="0.5"/>
                <rect x="3" y="6" width="2" height="5" rx="0.5"/>
                <rect x="6" y="4" width="2" height="7" rx="0.5"/>
                <rect x="9" y="2" width="2" height="9" rx="0.5"/>
                <rect x="12" y="0" width="2" height="11" rx="0.5" opacity="0.3"/>
              </svg>
              <span>5G</span>
              <!-- Battery Icon -->
              <div style="
                width: 22px;
                height: 11px;
                border: 1px solid currentColor;
                border-radius: 3px;
                padding: 1px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                position: relative;
              ">
                <div style="height: 100%; width: 90%; background-color: currentColor; border-radius: 1px;"></div>
                <div style="
                  position: absolute;
                  right: -3px;
                  top: 3px;
                  width: 2px;
                  height: 3px;
                  background-color: currentColor;
                  border-radius: 0 1px 1px 0;
                "></div>
              </div>
            </div>
          </div>

          <!-- Bottom Home Indicator Bar -->
          <div style="
            position: fixed;
            bottom: 9px;
            left: 50%;
            transform: translateX(-50%);
            width: 140px;
            height: 5px;
            background-color: #1a1a1a;
            border-radius: 10px;
            z-index: 100000001;
            pointer-events: none;
            box-shadow: 0 1px 1px rgba(255,255,255,0.2);
          "></div>
        `;
        document.body.appendChild(wrapper);

        // Inject page style rules to shift layout content safely out of the Dynamic Island and Bezel masks
        const style = document.createElement('style');
        style.id = 'iphone-style-applied';
        style.innerHTML = `
          body {
            padding-top: 52px !important;
            padding-bottom: 24px !important;
            max-width: 480px !important;
            margin: 0 auto !important;
            min-height: 100vh !important;
            background-color: #ffffff !important;
            box-sizing: border-box !important;
          }
        `;
        document.head.appendChild(style);
      });
    } catch (e) {
      console.warn('⚠️ [Mobile] Failed to apply glossy iPhone 17 Pro mockup frame overlay:', e.message);
    }
  }

  /**
   * Inject high-fidelity glossy Space Gray iPad Pro mockup frame.
   * Renders realistic bezel, rounded display border, status bar, and home indicator.
   */
  async injectIPadFrame() {
    console.log('💻 [Tablet] Injecting high-fidelity glossy iPad Pro mockup frame...');
    try {
      await this.page.evaluate(() => {
        if (document.getElementById('ipad-bezel-wrapper')) return;

        // Bezel and Status Overlays Container
        const wrapper = document.createElement('div');
        wrapper.id = 'ipad-bezel-wrapper';
        wrapper.innerHTML = `
          <!-- Premium iPad Space Gray Bezel Overlay -->
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            border: 18px solid #1c1d1e; /* Space Gray iPad Aluminum Frame */
            border-radius: 32px;
            box-sizing: border-box;
            pointer-events: none;
            z-index: 99999999;
            box-shadow: inset 0 0 15px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.4);
          "></div>
          
          <!-- Inner Screen Bezel Border -->
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 31px;
            box-sizing: border-box;
            pointer-events: none;
            z-index: 100000000;
          "></div>

          <!-- iPad Status Bar -->
          <div style="
            position: fixed;
            top: 20px;
            left: 0;
            width: 100vw;
            padding: 0 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: #1a1a1a;
            z-index: 100000001;
            pointer-events: none;
            box-sizing: border-box;
          ">
            <!-- Left Side: Date and Time -->
            <div>Tue, May 12 &nbsp;&bull;&nbsp; 9:41 AM</div>
            
            <!-- Right Side: Wifi and Battery -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
                <path d="M7.5 11C6.7 11 6 10.3 6 9.5C6 8.7 6.7 8 7.5 8C8.3 8 9 8.7 9 9.5C9 10.3 8.3 11 7.5 11ZM7.5 1C10.5 1 13.2 2.3 15 4.5L13.5 6C12 4.2 9.8 3.2 7.5 3.2C5.2 3.2 3 4.2 1.5 6L0 4.5C1.8 2.3 4.5 1 7.5 1Z"/>
              </svg>
              <!-- Battery Icon -->
              <div style="
                width: 22px;
                height: 11px;
                border: 1px solid currentColor;
                border-radius: 3px;
                padding: 1px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                position: relative;
              ">
                <div style="height: 100%; width: 100%; background-color: currentColor; border-radius: 1px;"></div>
                <div style="
                  position: absolute;
                  right: -3px;
                  top: 3px;
                  width: 2px;
                  height: 3px;
                  background-color: currentColor;
                  border-radius: 0 1px 1px 0;
                "></div>
              </div>
              <span>100%</span>
            </div>
          </div>

          <!-- Bottom iPad Home Bar -->
          <div style="
            position: fixed;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 180px;
            height: 5px;
            background-color: #1a1a1a;
            border-radius: 10px;
            z-index: 100000001;
            pointer-events: none;
          "></div>
        `;
        document.body.appendChild(wrapper);

        // Inject page style rules for tablet margins
        const style = document.createElement('style');
        style.id = 'ipad-style-applied';
        style.innerHTML = `
          body {
            padding-top: 52px !important;
            padding-bottom: 28px !important;
            max-width: 960px !important;
            margin: 0 auto !important;
            min-height: 100vh !important;
            background-color: #ffffff !important;
            box-sizing: border-box !important;
          }
        `;
        document.head.appendChild(style);
      });
    } catch (e) {
      console.warn('⚠️ [Tablet] Failed to apply glossy iPad Pro mockup frame overlay:', e.message);
    }
  }

  /**
   * Dynamically determines whether to inject an iPhone or iPad frame based on viewport width
   */
  async injectDeviceFrame() {
    try {
      const viewport = this.page.viewportSize();
      const isTablet = viewport && viewport.width >= 500;
      if (isTablet) {
        await this.injectIPadFrame();
      } else {
        await this.injectIPhoneFrame();
      }
    } catch (e) {
      await this.injectIPhoneFrame();
    }
  }

  /**
   * Navigates to target tracking URL and resets cookies/storage
   */
  async navigate(url) {
    console.log(`🔗 [Mobile] Navigating to: ${url}`);
    this.originalUrl = url;

    // Clear context state for clean mobile run
    await this.page.context().clearCookies();
    await this.page.context().clearPermissions();

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.warn(`⚠️ [Mobile] Navigation warning: ${e.message}. Continuing with page execution...`);
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    // Reset local/session storage on the mobile browser context
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB && window.indexedDB.databases) {
          window.indexedDB.databases().then(dbs => {
            dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
          });
        }
      });
    } catch (e) {
      console.warn('⚠️ [Mobile] Could not clear localStorage/sessionStorage:', e.message);
    }

    console.log('✅ [Mobile] Page loaded successfully');
    this.redirectedUrl = this.page.url();
    await this.injectDeviceFrame();
  }

  /**
   * Orchestrates the step-by-step filling of the mobile questionnaire
   */
  async fillForm(data = {}) {
    await this.injectDeviceFrame();
    console.log('📝 [Mobile] Starting mobile-specific form filling...');
    const { sliderAmount, targetMin, targetMax, state, firstName, lastName, email, phone } = data;
    const runIndex = data.runIndex || 0;
    this.runIndex = runIndex;
    const defaultSliderAmount = sliderAmount || '20000';
    const defaultState = state || 'RI';
    const defaultFirstName = firstName || 'ckmtestpixel';
    const defaultLastName = lastName || 'ckmtestpixel';
    const defaultEmail = email || 'ckmtestpixel@gmail.com';
    const defaultPhone = phone || '4012473406';

    try {
      let taxDebtSelect;
      // ===== STEP 1: DEBT AMOUNT =====
      await this.waitForSpinner();
      console.log(`🔘 [Mobile] Step 1: Selecting Debt Amount (${sliderAmount})`);

      try {
        let selected = false;



        // Check for jQuery UI Slider (#slider, #slider2, .ui-slider)
        const jquerySlider = this.page.locator('#slider, #slider2, .ui-slider').first();
        if (await jquerySlider.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log('🔘 [Mobile] Found jQuery UI Slider #slider. Setting value via jQuery and DOM evaluation...');
          await this.page.evaluate((amount) => {
            const cleanVal = parseInt(amount.replace(/[$,\s]/g, ''));
            const $ = window.jQuery || window.$;
            if ($ && $.fn && $.fn.slider) {
              const $slider = $('#slider, #slider2, .ui-slider').first();
              if ($slider.length > 0) {
                $slider.slider('value', cleanVal);
                const handle = $slider.find('.ui-slider-handle')[0];
                $slider.trigger('slide', [{ value: cleanVal, handle: handle }]);
                $slider.trigger('slidechange', [{ value: cleanVal, handle: handle }]);
              }
            }
            // Manually sync values
            const taxvalInput = document.querySelector('.taxval, input[name="tax_debt"], input#tax_debt');
            if (taxvalInput) {
              taxvalInput.value = cleanVal;
              taxvalInput.dispatchEvent(new Event('change', { bubbles: true }));
              taxvalInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const pricePicker = document.querySelector('.price-picker, .slider-val, .range-value');
            if (pricePicker) {
              pricePicker.textContent = '$' + cleanVal.toLocaleString();
            }
          }, sliderAmount);
          console.log(`✅ [Mobile] Set jQuery UI Slider #slider to ${sliderAmount}`);
          selected = true;
          this.selectedSliderAmount = sliderAmount;
          await this.page.waitForTimeout(300);
        }

        // Check for range input slider
        const rangeInput = this.page.locator('input[type="range"]').first();
        if (await rangeInput.isVisible({ timeout: 1500 })) {
          console.log('🔘 [Mobile] Found range input slider. Setting value via DOM evaluation...');
          await rangeInput.evaluate((node, amountVal) => {
            const cleanVal = amountVal.replace(/[$,\s]/g, '');
            node.value = cleanVal;
            node.dispatchEvent(new Event('change', { bubbles: true }));
            node.dispatchEvent(new Event('input', { bubbles: true }));
          }, sliderAmount);
          console.log(`✅ [Mobile] Set range input slider to ${sliderAmount}`);
          selected = true;
          await this.page.waitForTimeout(300);
        }

        // Check for standard select dropdown (Prioritize for mobile/tablet responsive layouts)
        taxDebtSelect = this.page.locator('select#tax_debt, select[name="tax_debt"], .debt-select').first();
        if (await taxDebtSelect.isVisible({ timeout: 1500 }).catch(() => false)) {
          const optionsLocator = taxDebtSelect.locator('option');
          const count = await optionsLocator.count().catch(() => 0);
          
          if (count > 0) {
            console.log(`🔍 [Mobile Dropdown Scanner] Scanning ${count} dropdown options against daily range: ${targetMin} - ${targetMax}`);
            const validOptions = [];
            
            for (let i = 0; i < count; i++) {
              const opt = optionsLocator.nth(i);
              const text = await opt.textContent().catch(() => '');
              const value = await opt.getAttribute('value').catch(() => '');
              const clean = text.toLowerCase().replace(/[$,\s]/g, '').replace(/k/g, '000').replace(/m/g, '000000');
              
              if (!clean || clean.includes('select')) continue;
              
              let optMin = 0;
              let optMax = 9999999;
              
              if (clean.includes('under') || clean.includes('less')) {
                const m = clean.match(/\d+/);
                if (m) { optMin = 0; optMax = parseInt(m[0]); }
              } else if (clean.includes('+') || clean.includes('more') || clean.includes('above')) {
                const m = clean.match(/\d+/);
                if (m) { optMin = parseInt(m[0]); optMax = 9999999; }
              } else {
                const m = clean.match(/\d+/g);
                if (m && m.length >= 2) { optMin = parseInt(m[0]); optMax = parseInt(m[1]); }
                else if (m && m.length === 1) { optMin = parseInt(m[0]); optMax = parseInt(m[0]); }
              }
              
              if ((optMin <= targetMax && optMax >= targetMin) || (targetMin === undefined)) {
                validOptions.push({ text: text.trim(), value, index: i });
              }
            }
            
            if (validOptions.length > 0) {
              const selectedOpt = validOptions[runIndex % validOptions.length];
              console.log(`✅ [Mobile Rotational Logic] Selected dropdown choice: "${selectedOpt.text}"`);
              await taxDebtSelect.evaluate(el => {
                el.style.outline = '5px solid #FF1493';
                el.style.border = '2px solid #FF1493';
                el.style.backgroundColor = '#FFE4E1';
                el.style.boxShadow = '0 0 20px #FF1493';
                el.focus();
              }).catch(() => {});
              await taxDebtSelect.click({ force: true }).catch(() => {});
              await this.page.waitForTimeout(2000);
              await taxDebtSelect.selectOption(selectedOpt.value || { index: selectedOpt.index });
              await taxDebtSelect.evaluate(el => {
                el.style.backgroundColor = '#ADFF2F';
                el.style.outline = '5px solid #32CD32';
                el.style.boxShadow = '0 0 20px #32CD32';
              }).catch(() => {});
              await this.page.waitForTimeout(2000);
              this.selectedSliderAmount = selectedOpt.text;
              selected = true;
            } else {
              console.log('⚠️ [Mobile Dropdown Scanner] No options match the daily range. Attempting fallback to nearest available max tier...');
              await taxDebtSelect.evaluate(el => {
                el.style.outline = '5px solid #FF8C00';
                el.style.backgroundColor = '#FFEBCD';
                el.style.boxShadow = '0 0 20px #FF8C00';
                el.focus();
              }).catch(() => {});
              await taxDebtSelect.click({ force: true }).catch(() => {});
              await this.page.waitForTimeout(2000);
              await taxDebtSelect.selectOption({ index: count - 1 }).catch(() => {});
              await taxDebtSelect.evaluate(el => {
                el.style.backgroundColor = '#ADFF2F';
                el.style.outline = '5px solid #32CD32';
                el.style.boxShadow = '0 0 20px #32CD32';
              }).catch(() => {});
              await this.page.waitForTimeout(2000);
              this.selectedSliderAmount = await taxDebtSelect.locator('option').nth(count - 1).textContent().catch(() => sliderAmount);
              selected = true;
            }
          }
        }

        if (!selected) {
          const amountStr = sliderAmount.replace(/,/g, '');
          const amountNum = parseInt(amountStr);
          let amountK;
          if (amountNum === 1000) {
            amountK = 1;
          } else {
            amountK = Math.round(amountNum / 1000);
          }

          // Define options for mobile selectors
          const sliderSelectors = [
            `span:has-text("$${amountK},000")`,
            `span:has-text("$${amountK}k")`,
            `span:has-text("$${amountK},000+")`,
            `label:has-text("$${amountK},000")`,
            `div:has-text("$${amountK},000")`,
            `.slider-option:has-text("${amountK},000")`,
            `[data-value="${amountStr}"]`,
            `[data-amount="${amountStr}"]`
          ];
          for (const selector of sliderSelectors) {
            const option = this.page.locator(selector).first();
            if (await option.isVisible({ timeout: 1500 })) {
              // Tap/click the option on mobile view
              await option.tap({ force: true }).catch(() => option.click({ force: true }));
              console.log(`✅ [Mobile] Selected debt amount: ${selector}`);
              selected = true;
              break;
            }
          }

          if (!selected) {
            // Find all visible options on the page (spans, divs, labels, buttons)
            console.log(`🔍 [Mobile Smart Choice Scanner] Scanning for options matching daily range: ${targetMin} - ${targetMax}`);
            
            const matchData = await this.page.evaluate(({ tMin, tMax, rIndex }) => {
              const elements = Array.from(document.querySelectorAll('span, label, div, button, li'));
              const validChoices = [];
              
              for (const el of elements) {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0) continue;
                
                const text = (el.innerText || el.textContent || '').trim();
                if (!text || text.length > 60 || text.toLowerCase().includes('select') || text.toLowerCase().includes('copyright') || text.includes('©')) continue;
                
                const clean = text.toLowerCase().replace(/[$,\s]/g, '').replace(/k/g, '000').replace(/m/g, '000000');
                
                let optMin = 0;
                let optMax = 9999999;
                
                if (clean.includes('under') || clean.includes('less')) {
                  const m = clean.match(/\d+/);
                  if (m) { optMin = 0; optMax = parseInt(m[0], 10); } else continue;
                } else if (clean.includes('+') || clean.includes('more') || clean.includes('above')) {
                  const m = clean.match(/\d+/);
                  if (m) { optMin = parseInt(m[0], 10); optMax = 9999999; } else continue;
                } else {
                  const m = clean.match(/\d+/g);
                  if (m && m.length >= 2) { optMin = parseInt(m[0], 10); optMax = parseInt(m[1], 10); }
                  else if (m && m.length === 1) { optMin = parseInt(m[0], 10); optMax = parseInt(m[0], 10); }
                  else continue;
                }
                
                if ((tMin !== undefined && optMin <= tMax && optMax >= tMin) || (tMin === undefined)) {
                  validChoices.push({ text: text.trim(), el });
                }
              }
              
              if (validChoices.length > 0) {
                const choice = validChoices[rIndex % validChoices.length];
                choice.el.click();
                return { success: true, text: choice.text };
              }
              return { success: false };
            }, { tMin: targetMin, tMax: targetMax, rIndex: runIndex });

            if (matchData && matchData.success) {
              console.log(`✅ [Mobile Rotational Logic] Selected Smart Choice option: "${matchData.text}"`);
              this.selectedSliderAmount = matchData.text;
              selected = true;
            }
          }

          if (!selected) {
            // Fallback regex scan for mobile layouts
            const fallbackRegex = new RegExp(`${amountK}.*000`);
            const fallback = this.page.locator('span, div, label, li').filter({ hasText: fallbackRegex }).first();
            if (await fallback.isVisible({ timeout: 1500 })) {
              await fallback.tap({ force: true }).catch(() => fallback.click({ force: true }));
              console.log('✅ [Mobile] Selected debt amount via regex fallback');
              selected = true;
            }
          }

          if (!selected) {
            console.log('⚠️ [Mobile] Attempting FTH-specific card select fallback...');
            const fthCards = [
              'div:has-text("5,000")', 'span:has-text("5,000")',
              'div:has-text("10,000")', 'span:has-text("10,000")',
              'div:has-text("20,000")', 'span:has-text("20,000")',
              'div:has-text("50,000")', 'span:has-text("50,000")',
              'div:has-text("Under")', 'div:has-text("More")'
            ];
            for (const selector of fthCards) {
              const option = this.page.locator(selector).first();
              if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
                await option.tap({ force: true }).catch(() => option.click({ force: true }));
                let textVal = await option.textContent().catch(() => '');
                textVal = textVal ? textVal.trim() : '';
                this.selectedSliderAmount = (textVal && textVal.length < 50) ? textVal : sliderAmount;
                console.log(`✅ [Mobile] Selected FTH fallback choice card: ${selector} ("${this.selectedSliderAmount}")`);
                selected = true;
                break;
              }
            }
          }

          if (!selected) {
            const debtInput = this.page.locator('#debt_amount, input[name="debt_amount"]').first();
            if (await debtInput.isVisible({ timeout: 1500 })) {
              await debtInput.tap().catch(() => debtInput.click());
              await debtInput.fill(amountStr);
              console.log(`✅ [Mobile] Inputted debt amount directly: ${amountStr}`);
              selected = true;
            }
          }
        }

        // Live-extract the actual selected/filled slider value directly from the webpage DOM
        try {
          taxDebtSelect = this.page.locator('select#tax_debt, select[name="tax_debt"], select[name="debt_amount"], select.debt-select, select.taxval, select:visible').first();
          if (await taxDebtSelect.isVisible().catch(() => false)) {
            const selectedText = await taxDebtSelect.evaluate(node => {
              const opt = node.options[node.selectedIndex];
              return opt ? opt.text : '';
            }).catch(() => '');
            if (selectedText) {
              this.selectedSliderAmount = selectedText.trim();
            }
          } else {
            const rangeInput = this.page.locator('input[type="range"]').first();
            if (await rangeInput.isVisible().catch(() => false)) {
              const val = await rangeInput.inputValue().catch(() => '');
              if (val) this.selectedSliderAmount = val;
            } else {
              const debtInput = this.page.locator('#debt_amount, input[name="debt_amount"]').first();
              if (await debtInput.isVisible().catch(() => false)) {
                const val = await debtInput.inputValue().catch(() => '');
              } else {
                if (!this.selectedSliderAmount) {
                  this.selectedSliderAmount = sliderAmount;
                }
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ [Mobile] Could not live-extract slider amount:', err.message);
          if (!this.selectedSliderAmount) {
            this.selectedSliderAmount = sliderAmount;
          }
        }
      } catch (e) {
        console.warn('⚠️ [Mobile] Could not complete debt selection:', e.message);
      }

      await this.clickNextButton('.next-btn1, .btn-next');

      // ==================================================
      // 🔹 DYNAMIC CHOICE/INTERMEDIATE STEPS TRAVERSAL
      // ==================================================
      let safetyCounter = 0;
      let choiceStepCount = 0;
      while (safetyCounter < 8) {
        await this.waitForSpinner();
        const isStateVisible = await this.page.locator('#state:visible, select#state:visible').first().isVisible({ timeout: 1000 }).catch(() => false);
        const isContactVisible = await this.page.locator('#first_name:visible, input[name="first_name"]:visible').first().isVisible({ timeout: 1000 }).catch(() => false);

        if (isStateVisible || isContactVisible) {
          console.log('✅ [Mobile] Reached a recognized terminal step. Stopping dynamic traversal.');
          break;
        }

        // ✅ FIX: Added checkbox/radio button selectors for "Do you owe tax debt?" and other question steps
        const choiceSelectors = [
          'label:visible',
          'input[type="checkbox"]:visible', 'input[type="radio"]:visible',
          'label:has(input[type="checkbox"]):visible', 'label:has(input[type="radio"]):visible',
          '.custom-btn:visible', '.choice-btn:visible', '.choice-box:visible', '.btn-choice:visible',
          '.form-choice:visible', '.debt-option:visible', 'label.custom-control-label:visible',
          '.option-button:visible', '.selection-item:visible', '.quiz-option:visible', '.step-choice:visible',
          '.debt-type:visible', '.quiz-btn:visible', 'div[role="button"]:visible', 'button:not([type="submit"]):visible'
        ];

        let clickedChoice = false;
        for (const selector of choiceSelectors) {
          const choices = await this.page.$$(selector);
          if (choices.length > 0) {
            const indexToSelect = runIndex % choices.length;
            const target = choices[indexToSelect];
            
            // Get text before clicking
            const text = await target.innerText().catch(() => '');
            console.log(`🔘 [Rotation-Mobile] Selecting Option ${indexToSelect + 1}: "${text}"`);
            
            // Click/tap the element
            await target.click({ force: true }).catch(async () => { await target.tap({ force: true }).catch(() => {}); });
            
            choiceStepCount++;
            if (choiceStepCount >= 1 && choiceStepCount <= 10) {
              this[`step${choiceStepCount}`] = text ? text.trim() : '';
            }
            clickedChoice = true;

            // Wait after selection
            console.log('⏳ Waiting 2 seconds after choice selection on Mobile...');
            await this.page.waitForTimeout(2000);

            // Check if the choice (or options) is still visible (indicating no auto-advance)
            const stillVisible = await target.isVisible().catch(() => false);
            if (stillVisible) {
              console.log('🔘 Choice is still visible (no auto-advance). Clicking/tapping NEXT button on Mobile...');
              const nextBtn = this.page.locator('.next-btn:visible, .btn-next:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible, .next:visible').first();
              if (await nextBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
                await nextBtn.click({ force: true }).catch(async () => { await nextBtn.tap({ force: true }).catch(() => {}); });
                console.log('✅ Clicked/tapped NEXT button after selecting checkbox/radio on Mobile.');
                await this.page.waitForTimeout(2000);
                await this.injectDeviceFrame();
              } else {
                console.log('⚠️ NEXT button not visible after checkbox selection on Mobile.');
              }
            } else {
              console.log('✅ Page auto-advanced after option selection on Mobile.');
              await this.injectDeviceFrame();
            }
            break;
          }
        }

        if (!clickedChoice) {
          const nextBtn = this.page.locator('.btn-next:visible, .next-btn:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible, .next:visible').first();
          if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('🔘 [Mobile] No choices found, but NEXT button is visible. Clicking to advance...');
            await nextBtn.click({ force: true }).catch(async () => { await nextBtn.tap({ force: true }); });
            await this.page.waitForTimeout(2000);
            await this.injectDeviceFrame();
          } else {
            console.log('⚠️ [Mobile] No visible dynamic choices or next buttons on this step. Ending traversal.');
            break;
          }
        }
        safetyCounter++;
      }

      // ===== STEP 2: STATE SELECTION =====
      await this.waitForSpinner();
      const stateSelect = this.page.locator('#state, select#state, select[name="state"]').first();
      if (await stateSelect.isVisible({ timeout: 2000 })) {
        console.log('🔘 [Mobile] Step 2: Selecting State');
        try {
          const selectedState = await this.page.evaluate(({ stateSelectSelector, runIndex, defaultState }) => {
            const node = document.querySelector(stateSelectSelector);
            if (node && node.options.length > 1) {
              const validOptions = Array.from(node.options).filter(opt => {
                const val = opt.value.trim();
                const txt = opt.text.toLowerCase();
                return val !== "" && !txt.includes("select") && !txt.includes("choose");
              });

              if (defaultState) {
                const target = defaultState.trim().toLowerCase();
                const matchedOpt = validOptions.find(opt => 
                  opt.text.trim().toLowerCase() === target || 
                  opt.value.trim().toLowerCase() === target
                );
                if (matchedOpt) {
                  node.value = matchedOpt.value;
                  node.dispatchEvent(new Event('change', { bubbles: true }));
                  node.dispatchEvent(new Event('input', { bubbles: true }));
                  return matchedOpt.text;
                }
              }

              if (validOptions.length > 0) {
                const selectedOpt = validOptions[runIndex % validOptions.length];
                node.value = selectedOpt.value;
                node.dispatchEvent(new Event('change', { bubbles: true }));
                node.dispatchEvent(new Event('input', { bubbles: true }));
                return selectedOpt.text;
              }
            }
            if (node) {
              node.value = defaultState;
              node.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return defaultState;
          }, { stateSelectSelector: '#state, select#state, select[name="state"]', runIndex, defaultState: state });

          console.log(`✅ [Mobile] Selected state dynamically: "${selectedState}"`);
          if (choiceStepCount < 3) {
            this.step3 = selectedState || state;
            console.log(`📝 [Mobile] step3 column set to State: "${this.step3}"`);
          }
        } catch (e) {
          console.warn('⚠️ [Mobile] State dropdown setting failed, continuing:', e.message);
        }
        await this.clickNextButton('.next-btn, .next-btn2, .btn-next');
      }

      // ===== POST-STATE DYNAMIC STEPS (If any) =====
      await this.waitForSpinner();
      let postStateCounter = 0;
      while (postStateCounter < 3) {
        const isContactVisible = await this.page.locator('#first_name, input[name="first_name"]').first().isVisible({ timeout: 1000 }).catch(() => false);
        if (isContactVisible) break;

        const nextBtn = this.page.locator('.btn-next, .next-btn, button:has-text("NEXT"), button:has-text("Next")').first();
        if (await nextBtn.isVisible({ timeout: 1000 })) {
          console.log('🔘 [Mobile] Advancing past post-state step...');
          await nextBtn.tap({ force: true }).catch(() => nextBtn.click({ force: true }));
          await this.page.waitForTimeout(400);
          await this.injectDeviceFrame();
        } else {
          break;
        }
        postStateCounter++;
      }

      // ===== STEP 3: CONTACT INFORMATION (Unbreakable Dynamic Step-based Loop) =====
      await this.waitForSpinner();
      console.log('🔘 [Mobile] Step 3: Filling Contact Info (Dynamic Loop)...');

      let contactSafetyCounter = 0;
      let lastFilledState = "";
      while (contactSafetyCounter < 10) {
        await this.waitForSpinner();
        await this.injectDeviceFrame();

        // Exit immediately if thank you page is detected
        const currentUrl = this.page.url();
        if (currentUrl.includes('/ty') || currentUrl.includes('/thank-you') || currentUrl.includes('/thankyou') || currentUrl.includes('leadid=') || currentUrl.includes('transaction_id=')) {
          console.log('✅ [Mobile] Thank you page or lead id detected in URL during contact loop. Exiting contact loop.');
          break;
        }

        let filledSomething = false;

        // First Name
        const fName = this.page.locator('#first_name, input[name="first_name"], input[placeholder*="First Name" i]').first();
        if (await fName.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = await fName.inputValue().catch(() => '');
          if (!currentVal || currentVal !== firstName) {
            await fName.evaluate((node, val) => {
              node.value = val;
              node.dispatchEvent(new Event('input', { bubbles: true }));
              node.dispatchEvent(new Event('change', { bubbles: true }));
            }, firstName);
            console.log(`✅ [Mobile] Filled First Name: ${firstName}`);
            filledSomething = true;
          }
        }

        // Last Name
        const lName = this.page.locator('#last_name, input[name="last_name"], input[placeholder*="Last Name" i]').first();
        if (await lName.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = await lName.inputValue().catch(() => '');
          if (!currentVal || currentVal !== lastName) {
            await lName.evaluate((node, val) => {
              node.value = val;
              node.dispatchEvent(new Event('input', { bubbles: true }));
              node.dispatchEvent(new Event('change', { bubbles: true }));
            }, lastName);
            console.log(`✅ [Mobile] Filled Last Name: ${lastName}`);
            filledSomething = true;
          }
        }

        // Email
        const emailField = this.page.locator('#email, #email_address, input[name="email"], input[name="email_address"], input[type="email"], input[placeholder*="Email" i]').first();
        if (await emailField.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = await emailField.inputValue().catch(() => '');
          if (!currentVal || currentVal !== email) {
            await emailField.evaluate((node, val) => {
              node.value = val;
              node.dispatchEvent(new Event('input', { bubbles: true }));
              node.dispatchEvent(new Event('change', { bubbles: true }));
            }, email);
            console.log(`✅ [Mobile] Filled Email: ${email}`);
            filledSomething = true;
          }
        }

        // Phone
        const phoneField = this.page.locator('#primary_phone, #phone, #phone_home, input[name="phone"], input[name="phone_home"], input[name="primary_phone"], input[type="tel"]').first();
        if (await phoneField.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = await phoneField.inputValue().catch(() => '');
          if (!currentVal || currentVal !== phone) {
            await phoneField.evaluate((node, val) => {
              node.value = val;
              node.dispatchEvent(new Event('input', { bubbles: true }));
              node.dispatchEvent(new Event('change', { bubbles: true }));
            }, phone);
            console.log(`✅ [Mobile] Filled Phone: ${phone}`);
            filledSomething = true;
          }
        }

        // Click next/submit button if visible on this contact sub-step
        const visibleSelector = '#reload-button:visible, #fakeNextBtn:visible, .btn-next:visible, .next-btn:visible, .next-btn3:visible, .next-btn4:visible, .next-btn5:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible, button:has-text("Submit"):visible, button:has-text("Continue"):visible, input[type="submit"]:visible, .emailbtn:visible, .namebtn:visible';
        const nextBtn = this.page.locator(visibleSelector).first();
        
        if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          const btnText = await nextBtn.textContent().catch(() => 'Next');
          const currentUrl = this.page.url();
          const currentState = `${currentUrl}_${btnText}`;
          
          if (!filledSomething && currentState === lastFilledState) {
            console.log('🔘 [Mobile] Contact form stable (no new fields to fill). Exiting contact loop.');
            break;
          }
          
          lastFilledState = currentState;
          console.log(`🔘 [Mobile] Clicking active contact NEXT/SUBMIT button...`);
          await nextBtn.evaluate(node => node.click()).catch(async () => {
            await nextBtn.tap({ force: true }).catch(() => {});
          });
          await this.page.waitForTimeout(2000);
        } else {
          console.log('🔘 [Mobile] No active contact NEXT/SUBMIT button visible. Exiting loop.');
          break;
        }

        contactSafetyCounter++;
      }

      // ===== STEP 4: ADAPTIVE MOBILE SUBMIT SCAN =====
      console.log('🔘 [Mobile] Scanning for additional dynamic steps...');
      for (let i = 0; i < 3; i++) {
        await this.waitForSpinner();

        // Check if thank you page/redirect was reached during the loop
        const currentUrl = this.page.url();
        if (currentUrl.includes('/ty') || currentUrl.includes('/thank-you') || currentUrl.includes('/thankyou') || currentUrl.includes('leadid=') || currentUrl.includes('transaction_id=')) {
          console.log('✅ [Mobile] Thank you page detected during adaptive submit loop. Exiting loop.');
          break;
        }

        const extraBtn = this.page.locator('#reload-button, #fakeNextBtn, #submitBtn, .next-btn6.submitBtn, .next-btn7.submitBtn, .next-btn-1, button:has-text("NEXT"), button:has-text("Submit"), button:has-text("Continue")').first();
        if (await extraBtn.isVisible({ timeout: 2000 })) {
          const btnClass = await extraBtn.getAttribute('class').catch(() => 'btn');
          console.log(`✅ [Mobile] Extra submit/next button found (${btnClass}), clicking (Attempt ${i + 1})...`);
          await extraBtn.tap().catch(() => extraBtn.click()).catch(async () => {
            await extraBtn.evaluate(node => node.click());
          });
          await this.page.waitForTimeout(2000);
        }
      }

    } catch (error) {
      console.error('❌ [Mobile] Error during form filling:', error.message);
      throw error;
    }

    return { extractedSliderAmount: this.selectedSliderAmount };
  }

  /**
   * Mobile-optimized button clicking helper
   */
  async clickNextButton(selector) {
    try {
      // Split selectors by comma and append :visible to each to ensure we only target the active visible button
      const visibleSelector = selector.split(',').map(s => `${s.trim()}:visible`).join(', ');
      const btn = this.page.locator(visibleSelector).first();
      const count = await btn.count();
      
      if (count > 0) {
        console.log(`🔘 [Mobile] Clicking active visible button: ${visibleSelector}`);
        await btn.evaluate(node => {
          node.scrollIntoView();
          node.click();
        }).catch(async () => {
          await btn.tap({ force: true, timeout: 2000 }).catch(async () => {
            await btn.click({ force: true, timeout: 2000 });
          });
        });
        console.log(`✅ [Mobile] Clicked: ${visibleSelector}`);
        await this.page.waitForTimeout(1500);
      } else {
        // Fallback list of specific next buttons evaluated sequentially and strictly with :visible filter
        const genericSelectors = [
          'button:has-text("NEXT"):visible', 'button:has-text("Next"):visible',
          'button:has-text("Submit"):visible', 'button:has-text("Continue"):visible',
          '.next-btn5:visible', '.next-btn4:visible', '.next-btn3:visible', '.next-btn2:visible', '.next-btn1:visible', '.next-btn:visible'
        ];
        
        let fallbackClicked = false;
        for (const sel of genericSelectors) {
          const fallbackBtn = this.page.locator(sel).first();
          if (await fallbackBtn.isVisible({ timeout: 1000 })) {
            console.log(`🔘 [Mobile] Clicking fallback button: ${sel}`);
            await fallbackBtn.evaluate(node => node.click()).catch(async () => {
              await fallbackBtn.tap({ force: true }).catch(() => fallbackBtn.click({ force: true }));
            });
            console.log(`✅ [Mobile] Clicked fallback: ${sel}`);
            await this.page.waitForTimeout(1500);
            fallbackClicked = true;
            break;
          }
        }
        
        if (!fallbackClicked) {
          console.warn(`⚠️ [Mobile] No active visible next button found for selector ${selector}`);
        }
      }
      await this.injectDeviceFrame();
    } catch (e) {
      console.warn(`⚠️  [Mobile] Button ${selector} not found. Consulting AI Agent for suggestions...`);
      const suggestion = await aiAgent.suggestFix(this.page, 'Next button');
      if (suggestion) {
        console.warn(`🤖 [AI Agent] POTENTIAL MOBILE FIX DISCOVERED: ${suggestion}`);
        console.warn(`🔔 [Manual Approval Required] Please update the selector in MobileFormPage.js to use: ${suggestion}`);
      } else {
        console.warn(`❌ [AI Agent] No suggestion available for this mobile failure.`);
      }
      throw new Error(`Mobile Navigation button ${selector} missing. AI Agent suggestion provided in logs.`);
    }
  }

  /**
   * Triggers the final submission block if not already submitted
   */
  async submitForm() {
    console.log('🔘 [Mobile] Submitting form');

    // Bypass if already submitted/on thank you page to prevent timeout delays
    const currentUrl = this.page.url();
    if (currentUrl.includes('/ty') || currentUrl.includes('/thank-you') || currentUrl.includes('/thankyou') || currentUrl.includes('leadid=') || currentUrl.includes('transaction_id=')) {
      console.log('✅ [Mobile] Form already submitted. Bypassing submitForm logic.');
      return;
    }

    try {
      // CRITICAL: Ensure debt value is properly set in hidden fields before submission
      let cleanDebtVal = this.selectedSliderAmount.toString().replace(/,/g, '').trim();
      const match = cleanDebtVal.match(/\d+/);
      let numericDebt = match ? parseInt(match[0]) : 0;
      
      cleanDebtVal = numericDebt > 0 ? numericDebt.toString() : cleanDebtVal;

      if (cleanDebtVal) {
        console.log(`💾 [Mobile] Setting hidden debt fields to: ${cleanDebtVal}`);
        await this.page.evaluate((debtVal) => {
          // Update all possible hidden debt field names with the selected slider value
          const debtFieldNames = ['tax_debt', 'debt_amount', 'debt', 'debt_value', 'debt_range', 'slider_value', 'amount', 'debt_range_value'];
          debtFieldNames.forEach(name => {
            const fields = document.querySelectorAll(`input[name="${name}"], input[id="${name}"], select[name="${name}"], select[id="${name}"]`);
            fields.forEach(field => {
              if (field.tagName.toLowerCase() === 'select') {
                let found = false;
                for (let i = 0; i < field.options.length; i++) {
                  if (field.options[i].value === debtVal || field.options[i].text.replace(/[^0-9]/g, '') === debtVal) {
                    field.value = field.options[i].value;
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  const opt = document.createElement('option');
                  opt.value = debtVal;
                  opt.text = debtVal;
                  field.add(opt);
                  field.value = debtVal;
                }
              } else {
                field.value = debtVal;
              }
              field.dispatchEvent(new Event('change', { bubbles: true }));
              field.dispatchEvent(new Event('input', { bubbles: true }));
              console.log(`✅ Updated ${field.tagName.toLowerCase()} ${name} = ${debtVal}`);
            });
          });
        }, cleanDebtVal);
      }

      const submitButtons = [
        this.page.locator('#submitBtn').first(),
        this.page.locator('button:has-text("NEXT")').first(),
        this.page.locator('.next-btn6.submitBtn').first(),
        this.page.locator('#fakeNextBtn').first(),
        this.page.locator('button[type="submit"]').first()
      ];

      for (const btn of submitButtons) {
        if (await btn.isVisible({ timeout: 1500 })) {
          console.log('✅ [Mobile] Submit button resolved, clicking...');
          await btn.tap().catch(() => btn.click()).catch(async () => {
            await btn.evaluate(node => node.click());
          });
          break;
        }
      }

      console.log('⏳ [Mobile] Waiting for submission navigation to complete');
      await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => { });

      // Last resort: AI Agent Self-Healing for Submit (Manual Approval Mode)
      console.warn('⚠️ [Mobile] Standard submit buttons not found, consulting AI Agent...');
      const suggestion = await aiAgent.suggestFix(this.page, 'Submit button');
      if (suggestion) {
        console.warn(`🤖 [AI Agent] POTENTIAL SUBMIT FIX DISCOVERED: ${suggestion}`);
        console.warn(`🔔 [Manual Approval Required] Update MobileFormPage.js submit block with: ${suggestion}`);
      }

    } catch (error) {
      console.warn('⚠️ [Mobile] Form submission failure analysis complete.');
    }
  }

  /**
   * Smart Redirection Polling Loop (Waits for transition to final confirmation pages)
   */
  async getThankYouUrl() {
    console.log('⏳ [Mobile] Waiting for final Thank You page redirection...');
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => { });

      const startTime = Date.now();
      const timeout = 12000; // Poll for max 12 seconds
      while (Date.now() - startTime < timeout) {
        const currentUrl = this.page.url();
        try {
          const parsedUrl = new URL(currentUrl);
          const hasHexLead = parsedUrl.searchParams.has('leadid') || parsedUrl.searchParams.get('transaction_id');
          const isFinalPage = currentUrl.includes('/ty') || currentUrl.includes('/thank-you') || currentUrl.includes('/thankyou');

          if (hasHexLead || isFinalPage) {
            console.log('✅ [Mobile] Targeted final redirect URL achieved!');
            break;
          }
        } catch (e) { }
        await this.page.waitForTimeout(1000);
      }
    } catch (e) {
      console.warn('⚠️ [Mobile] Error during redirect polling:', e.message);
    }
    const finalUrl = this.page.url();
    console.log('✅ [Mobile] Final Thank You URL:', finalUrl);
    return finalUrl;
  }

  /**
   * Extracts hexadecimal/numeric lead identifiers from URL
   */
  async extractLeadId(url) {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      console.log('📱 [Mobile Diagnostic] Full Thank You URL Parameters:', JSON.stringify(Object.fromEntries(params.entries())));

      // Helper to strictly validate true CAKE Lead IDs (8 chars, letters + numbers)
      const isAlphanumericHex8 = (id) => {
        if (!id) return false;
        const norm = id.trim().toUpperCase();
        return /^[A-Z0-9]{8}$/.test(norm) && /[A-Z]/.test(norm) && /[0-9]/.test(norm);
      };

      // Priority 1: URL Parameters
      const paramKeys = ['transaction_id', 'leadid', 'lead_id', 'ckm_id', 'tid', 'reqid', 'request_id', 'id'];
      let leadId = null;

      for (const key of paramKeys) {
        const val = params.get(key);
        if (isAlphanumericHex8(val)) {
          leadId = val;
          break;
        }
      }

      if (!leadId) {
        leadId = params.get('transaction_id') || params.get('leadid') || params.get('lead_id') || params.get('ckm_id') || params.get('tid') || params.get('reqid') || params.get('request_id') || params.get('id');
      }

      // Priority 2: DOM DEEP-SCAN (Hidden inputs, Text patterns, GUIDs, Hex-8)
      // If the extracted parameter is NOT a valid alphanumeric Hex-8 (e.g. it's a numeric reqid), we force the DOM scan.
      if (!isAlphanumericHex8(leadId)) {
        console.log('🔍 [Mobile DOM Deep-Scan] URL ID missing or non-standard (e.g. numeric reqid). Searching for Hex-8 or GUID IDs...');
        const domId = await this.page.evaluate(() => {
          // Remove scripts and styles before scanning text to avoid CSS hex colors or JS hashes
          const clone = document.body.cloneNode(true);
          const scripts = clone.querySelectorAll('script, style');
          scripts.forEach(s => s.remove());
          const html = clone.innerHTML;
          
          // 1. Search for strictly UPPERCASE 8-character Hex patterns with at least one letter
          const hex8Regex = /\b[0-9]*[A-F][A-F0-9]*\b/g;
          const matches = html.match(hex8Regex) || [];
          const validHex8 = matches.find(m => m.length === 8);
          if (validHex8) return validHex8;

          // 2. Search for GUID patterns (32 chars hex)
          const guidMatch = html.match(/[a-f0-9]{32}/i) || html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
          if (guidMatch) return guidMatch[0];

          // 3. Search for hidden inputs
          const inputs = Array.from(document.querySelectorAll('input[type="hidden"]'));
          for (const input of inputs) {
            if (input.name.toLowerCase().includes('id') && input.value.length >= 8) {
               const val = input.value.trim().toUpperCase();
               if (/^[A-Z0-9]{8}$/.test(val) && /[A-Z]/.test(val)) return val;
            }
          }

          const bodyText = clone.innerText;
          const longIdMatch = bodyText.match(/(?:ID|Transaction|Ref|Conf)\s*[:#-]?\s*([A-Z0-9-]{8,40})/i);
          return longIdMatch ? longIdMatch[1] : null;
        }).catch(() => null);

        if (domId) leadId = domId;
      }

      if (leadId) {
        console.log('✅ [Mobile] Extracted Lead ID:', leadId);
      } else {
        console.warn('⚠️ [Mobile] No Lead ID found in URL or DOM.');
      }

      return leadId;
    } catch (e) {
      console.error('❌ [Mobile] Error extracting lead ID:', e.message);
      return null;
    }
  }

  /**
   * Spinner check utility
   */
  async waitForSpinner() {
    try {
      const spinner = this.page.locator('.spinner, .loading, #loader, .loader').first();
      if (await spinner.isVisible()) {
        console.log('⏳ [Mobile] Loading spinner active, waiting for overlay to clear...');
        await spinner.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
      }
    } catch (e) { }
  }

  /**
   * Performs rotation selection for buttons on mobile/tablet
   */
  async handleChoiceRotation(selector, runIndex) {
    const locators = this.page.locator(selector);
    const count = await locators.count().catch(() => 0);
    if (count === 0) return null;

    const visibleOptions = [];
    for (let i = 0; i < count; i++) {
      const option = locators.nth(i);
      if (await option.isVisible({ timeout: 500 }).catch(() => false)) {
        let text = await option.innerText().catch(() => '');
        if (!text) text = await option.getAttribute('aria-label').catch(() => '');
        if (!text) text = await option.getAttribute('value').catch(() => '');
        if (!text) text = `Option ${i + 1}`;
        
        const cleaned = text.trim().replace(/\s+/g, ' ');
        if (cleaned && !this.clickedChoiceTexts.has(cleaned)) {
          visibleOptions.push({ option, text: cleaned });
        }
      }
    }

    if (visibleOptions.length > 0) {
      const chosen = visibleOptions[runIndex % visibleOptions.length];
      console.log(`🔘 [Mobile Rotation] Selected: "${chosen.text}"`);
      this.clickedChoiceTexts.add(chosen.text);
      // Support for touch/tap events on mobile
      await chosen.option.tap({ force: true }).catch(async () => {
        await chosen.option.click({ force: true });
      });
      await this.page.waitForTimeout(400);
      return chosen.text;
    }
    return null;
  }

  getPageOrigin() {
    return this.redirectedUrl || this.originalUrl;
  }
}

module.exports = MobileFormPage;
