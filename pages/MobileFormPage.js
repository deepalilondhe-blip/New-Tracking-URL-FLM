require('dotenv').config();

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
    this.step1 = 'N/A';
    this.step2 = 'N/A';
    this.step3 = 'N/A';
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
   * Inject high-fidelity glossy space-black Titanium iPhone 17 Pro frame layout.
   * Completely visual and dynamic, centering the questionnaire inside an authentic phone body.
   */
  async injectIPhoneFrame() {
    console.log('📱 [Mobile] Injecting Titanium iPhone 17 Pro device outline mockup...');
    try {
      await this.page.evaluate(() => {
        if (document.getElementById('iphone-frame-injected')) return;

        // Create style block
        const style = document.createElement('style');
        style.id = 'iphone-frame-style';
        style.innerHTML = `
          /* Reset body and background to desk workspace background */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            background: #eef1f6 !important; /* Premium desk surface gray */
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            overflow: hidden !important;
          }

          /* iPhone 17 Pro Device Outline Container (Optimized to fit screen boundaries perfectly) */
          #iphone-17-device {
            position: relative;
            width: 340px;
            height: 700px;
            background: #fff;
            border: 11px solid #1f1f21; /* Polished Titanium Bezel */
            border-radius: 46px;
            box-shadow: 0 25px 65px rgba(0, 0, 0, 0.4), 
                        0 0 0 2px #3a3a3c, /* Metallic bezel rim reflection */
                        inset 0 0 10px rgba(0,0,0,0.25);
            overflow: hidden;
            z-index: 999999;
            box-sizing: border-box;
            transform: translate3d(0, 0, 0); /* Containing block forces fixed elements to remain inside the device */
          }



          /* Dynamic Island Camera Notch */
          #dynamic-island {
            position: absolute;
            top: 13px;
            left: 50%;
            transform: translateX(-50%);
            width: 98px;
            height: 25px;
            background: #000;
            border-radius: 18px;
            z-index: 1000000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px;
            box-sizing: border-box;
            box-shadow: inset 0 1px 3px rgba(255,255,255,0.1);
          }

          #dynamic-island::before {
            content: '';
            width: 8px;
            height: 8px;
            background: #15151a;
            border-radius: 50%;
            box-shadow: inset 0 1px 2px rgba(255,255,255,0.3);
          }

          #dynamic-island::after {
            content: '';
            width: 5px;
            height: 5px;
            background: #051a42;
            border-radius: 50%;
            box-shadow: 0 0 2px #0cf;
          }

          /* Micro speaker slot at the top bezel */
          #speaker-grill {
            position: absolute;
            top: 5px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 3px;
            background: #2c2c2e;
            border-radius: 2px;
            z-index: 1000000;
          }

          /* Bottom Home Bar swipe indicator */
          #home-indicator {
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 115px;
            height: 4px;
            background: #000;
            border-radius: 2px;
            z-index: 1000000;
            opacity: 0.85;
          }

          /* iPhone Screen Content Viewport */
          #iphone-screen-content {
            width: 100%;
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            padding-top: 48px; /* clear dynamic island layout */
            padding-bottom: 20px; /* clear bottom home swipe indicator */
            box-sizing: border-box;
            background: #fff;
            -webkit-overflow-scrolling: touch;
          }

           #iphone-screen-content::-webkit-scrollbar {
            width: 4px;
          }
          #iphone-screen-content::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.12);
            border-radius: 10px;
          }
        `;
        document.head.appendChild(style);

        // Capture all original HTML elements in body
        const originalChildren = Array.from(document.body.children).filter(
          child => child !== style && child.tagName !== 'SCRIPT' && child.id !== 'iphone-17-device'
        );

        // Create iPhone frame element
        const deviceDiv = document.createElement('div');
        deviceDiv.id = 'iphone-17-device';

        // Add bezel modules
        const island = document.createElement('div');
        island.id = 'dynamic-island';
        deviceDiv.appendChild(island);

        const speaker = document.createElement('div');
        speaker.id = 'speaker-grill';
        deviceDiv.appendChild(speaker);

        const homeBar = document.createElement('div');
        homeBar.id = 'home-indicator';
        deviceDiv.appendChild(homeBar);

        // Screen wrapper
        const screenContent = document.createElement('div');
        screenContent.id = 'iphone-screen-content';

        // Reparent body DOM elements into the screen
        originalChildren.forEach(child => {
          screenContent.appendChild(child);
        });

        deviceDiv.appendChild(screenContent);

        // Reset document body to hold only styled iPhone layout
        document.body.innerHTML = '';
        document.body.appendChild(deviceDiv);

        const marker = document.createElement('div');
        marker.id = 'iphone-frame-injected';
        marker.style.display = 'none';
        document.body.appendChild(marker);
      });
    } catch (e) {
      console.warn('⚠️ [Mobile] Failed to inject iPhone bezel outline:', e.message);
    }
  }

  /**
   * Inject high-fidelity glossy space-gray iPad Pro frame layout.
   * Completely visual and dynamic, centering the questionnaire inside an authentic tablet body.
   */
  async injectIPadFrame() {
    console.log('💻 [Tablet] Injecting Liquid Retina iPad Pro device outline mockup...');
    try {
      await this.page.evaluate(() => {
        if (document.getElementById('ipad-frame-injected')) return;

        // Create style block
        const style = document.createElement('style');
        style.id = 'ipad-frame-style';
        style.innerHTML = `
          /* Reset body and background to desk workspace background */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            background: #eef1f6 !important; /* Premium desk surface gray */
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            overflow: hidden !important;
          }

          /* iPad Pro Device Outline Container */
          #ipad-device {
            position: relative;
            height: 96%;
            width: 94%;
            max-width: 1024px;
            max-height: 780px;
            background: #fff;
            border: 18px solid #1c1c1e; /* Space Gray Bezel */
            border-radius: 36px;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45), 
                        0 0 0 2px #48484a, /* Space Gray bevel rim reflection */
                        inset 0 0 12px rgba(0,0,0,0.3);
            overflow: hidden;
            z-index: 999999;
            box-sizing: border-box;
            transform: translate3d(0, 0, 0); /* Containing block forces fixed elements inside */
          }

          /* Micro camera lens slot at the top bezel */
          #ipad-camera {
            position: absolute;
            top: 5px; /* Centered in the top bezel border */
            left: 50%;
            transform: translateX(-50%);
            width: 10px;
            height: 10px;
            background: #051a42;
            border-radius: 50%;
            z-index: 1000000;
            box-shadow: 0 0 2px #0cf;
          }

          /* Bottom Home Bar swipe indicator */
          #ipad-home-indicator {
            position: absolute;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 160px;
            height: 4px;
            background: #000;
            border-radius: 2px;
            z-index: 1000000;
            opacity: 0.8;
          }

          /* iPad Screen Content Viewport */
          #ipad-screen-content {
            width: 100%;
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            padding-top: 15px; /* clear top bezel margin slightly */
            padding-bottom: 24px; /* clear bottom indicator layout */
            box-sizing: border-box;
            background: #fff;
            -webkit-overflow-scrolling: touch;
          }

          #ipad-screen-content::-webkit-scrollbar {
            width: 6px;
          }
          #ipad-screen-content::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.15);
            border-radius: 10px;
          }


        `;
        document.head.appendChild(style);

        // Capture all original HTML elements in body
        const originalChildren = Array.from(document.body.children).filter(
          child => child !== style && child.tagName !== 'SCRIPT' && child.id !== 'ipad-device'
        );

        // Create iPad frame element
        const deviceDiv = document.createElement('div');
        deviceDiv.id = 'ipad-device';

        // Add bezel modules
        const camera = document.createElement('div');
        camera.id = 'ipad-camera';
        deviceDiv.appendChild(camera);

        const homeBar = document.createElement('div');
        homeBar.id = 'ipad-home-indicator';
        deviceDiv.appendChild(homeBar);

        // Screen wrapper
        const screenContent = document.createElement('div');
        screenContent.id = 'ipad-screen-content';

        // Reparent body DOM elements into the screen
        originalChildren.forEach(child => {
          screenContent.appendChild(child);
        });

        deviceDiv.appendChild(screenContent);

        // Reset document body to hold only styled iPad layout
        document.body.innerHTML = '';
        document.body.appendChild(deviceDiv);

        const marker = document.createElement('div');
        marker.id = 'ipad-frame-injected';
        marker.style.display = 'none';
        document.body.appendChild(marker);
      });
    } catch (e) {
      console.warn('⚠️ [Tablet] Failed to inject iPad bezel outline:', e.message);
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

    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded');

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
    await this.injectDeviceFrame();
  }

  /**
   * Orchestrates the step-by-step filling of the mobile questionnaire
   */
  async fillForm(data = {}) {
    await this.injectDeviceFrame();
    console.log('📝 [Mobile] Starting mobile-specific form filling...');
    const sliderAmount = data.sliderAmount || '20000';
    const state = data.state || 'RI';
    const firstName = data.firstName || 'ckmtestpixel';
    const lastName = data.lastName || 'ckmtestpixel';
    const email = data.email || 'ckmtestpixel@gmail.com';
    const phone = data.phone || '4012473406';

    try {
      // ===== STEP 1: DEBT AMOUNT =====
      await this.waitForSpinner();
      console.log(`🔘 [Mobile] Step 1: Selecting Debt Amount (${sliderAmount})`);

      try {
        const amountStr = sliderAmount.replace(/,/g, '');
        const amountNum = parseInt(amountStr);
        // For this form with 10k step increments, round to nearest 10,000 for slider selection
        // Note: We still pass the actual requested value to Google Sheets and API
        const amountK = Math.round(amountNum / 10000) * 10;

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

        let selected = false;
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
          const debtInput = this.page.locator('#debt_amount, input[name="debt_amount"]').first();
          if (await debtInput.isVisible({ timeout: 1500 })) {
            await debtInput.tap().catch(() => debtInput.click());
            await debtInput.fill(amountStr);
            console.log(`✅ [Mobile] Inputted debt amount directly: ${amountStr}`);
          }
        }
      } catch (e) {
        console.warn('⚠️ [Mobile] Could not complete debt selection:', e.message);
      }

      await this.clickNextButton('.next-btn1');

      // ===== STEP: DEBT TYPE (If present) =====
      await this.waitForSpinner();
      try {
        const debtTypeLocator = this.page.locator('.next-btn2:has-text("Federal"), button:has-text("Federal")').first();
        if (await debtTypeLocator.isVisible({ timeout: 2000 })) {
          const stepHeader = await this.getVisibleStepHeader();
          const text = await debtTypeLocator.textContent().catch(() => "Federal");
          this.step1 = stepHeader ? `${stepHeader}: ${text.trim()}` : `Debt Type: ${text.trim()}`;
          console.log(`🔘 [Mobile] Step: Selecting Debt Type (${this.step1})`);
          await debtTypeLocator.tap({ force: true }).catch(() => debtTypeLocator.click({ force: true }));
          await this.page.waitForTimeout(1000);
          await this.injectDeviceFrame();
        }
      } catch (e) {
        console.warn('⚠️ [Mobile] Debt Type step check skipped:', e.message);
      }

      // ===== STEP 2: STATE SELECTION =====
      await this.waitForSpinner();
      console.log('🔘 [Mobile] Step 2: Selecting State');

      try {
        const stateSelect = this.page.locator('#state').first();
        // Try standard Playwright selectOption first which handles all framework state events perfectly
        await stateSelect.selectOption({ label: state }, { timeout: 3000 }).catch(async () => {
          await stateSelect.selectOption({ value: state }, { timeout: 3000 }).catch(async () => {
            // Fallback to direct DOM evaluation if standard select is hidden
            await stateSelect.evaluate((node, stateVal) => {
              const matchedOption = Array.from(node.options).find(opt =>
                opt.text.toLowerCase().trim() === stateVal.toLowerCase().trim() ||
                opt.value.toLowerCase().trim() === stateVal.toLowerCase().trim()
              );
              if (matchedOption) {
                node.value = matchedOption.value;
              } else {
                node.value = stateVal;
              }
              node.dispatchEvent(new Event('change', { bubbles: true }));
              node.dispatchEvent(new Event('input', { bubbles: true }));
            }, state);
          });
        });
        const stepHeader = await this.getVisibleStepHeader();
        this.step3 = stepHeader ? `${stepHeader}: ${state}` : `State: ${state}`;
        console.log(`✅ [Mobile] Selected State: ${this.step3}`);
      } catch (e) {
        console.warn('⚠️ [Mobile] State dropdown setting failed, continuing:', e.message);
      }

      await this.clickNextButton('.next-btn, .next-btn2');

      // ===== STEP: MONTHLY INCOME (If present) =====
      await this.waitForSpinner();
      try {
        const incomeLocator = this.page.locator('.next-btn3').first();
        if (await incomeLocator.isVisible({ timeout: 2000 })) {
          const stepHeader = await this.getVisibleStepHeader();
          const text = await incomeLocator.textContent().catch(() => "Less than $4,000");
          this.step2 = stepHeader ? `${stepHeader}: ${text.trim()}` : `Monthly Income: ${text.trim()}`;
          console.log(`🔘 [Mobile] Step: Selecting Monthly Income (${this.step2})`);
          await incomeLocator.tap({ force: true }).catch(() => incomeLocator.click({ force: true }));
          await this.page.waitForTimeout(1000);
          await this.injectDeviceFrame();
        }
      } catch (e) {
        console.warn('⚠️ [Mobile] Monthly Income step check skipped:', e.message);
      }

      // ===== STEP 3: CONTACT INFORMATION (Adaptive Flat or Wizard layout) =====
      await this.waitForSpinner();
      console.log('🔘 [Mobile] Step 3: Filling Contact Info (Adaptive Stepwise)');

      // 1. First Name
      try {
        const fName = this.page.locator('#first_name, input[name="first_name"]').first();
        if (await fName.isVisible({ timeout: 2000 })) {
          await fName.evaluate((node, val) => { 
            node.value = val; 
            node.dispatchEvent(new Event('input', { bubbles: true })); 
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }, firstName);
          console.log(`✅ [Mobile] First Name filled: ${firstName}`);
          
          // Check if Last Name is also visible on this exact same step
          const lName = this.page.locator('#last_name, input[name="last_name"]').first();
          if (!(await lName.isVisible({ timeout: 1000 }))) {
            console.log('🔘 [Mobile] Last Name not on first name step, advancing...');
            await this.clickNextButton('.next-btn3, .next-btn4, .next-btn');
          }
        }
      } catch (e) {
        console.warn('⚠️ [Mobile] First Name check skipped:', e.message);
      }

      // 2. Last Name
      await this.waitForSpinner();
      try {
        const lName = this.page.locator('#last_name, input[name="last_name"]').first();
        if (await lName.isVisible({ timeout: 2000 })) {
          await lName.evaluate((node, val) => { 
            node.value = val; 
            node.dispatchEvent(new Event('input', { bubbles: true })); 
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }, lastName);
          console.log(`✅ [Mobile] Last Name filled: ${lastName}`);
          
          // Check if Email is also visible on this exact same step
          const emailField = this.page.locator('#email, #email_address, input[name="email"], input[name="email_address"], input[type="email"], input[placeholder*="Email"]').first();
          if (!(await emailField.isVisible({ timeout: 1000 }))) {
            console.log('🔘 [Mobile] Email not on last name step, advancing...');
            await this.clickNextButton('.next-btn3, .next-btn4, .next-btn');
          }
        }
      } catch (e) {
        console.warn('⚠️ [Mobile] Last Name check skipped:', e.message);
      }

      // 3. Email
      await this.waitForSpinner();
      try {
        const emailField = this.page.locator('#email, #email_address, input[name="email"], input[name="email_address"], input[type="email"], input[placeholder*="Email"]').first();
        if (await emailField.isVisible({ timeout: 2000 })) {
          await emailField.evaluate((node, val) => { 
            node.value = val; 
            node.dispatchEvent(new Event('input', { bubbles: true })); 
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }, email);
          console.log(`✅ [Mobile] Email filled: ${email}`);
          await this.clickNextButton('.next-btn3, .next-btn4, .next-btn');
        }
      } catch (e) {
        console.warn('⚠️ [Mobile] Email check skipped:', e.message);
      }

      // 4. Phone Number
      await this.waitForSpinner();
      try {
        const phoneField = this.page.locator('#primary_phone, #phone, #phone_home, input[name="phone"], input[name="phone_home"], input[name="primary_phone"], input[type="tel"]').first();
        if (await phoneField.isVisible({ timeout: 2000 })) {
          await phoneField.evaluate((node, val) => { 
            node.value = val; 
            node.dispatchEvent(new Event('input', { bubbles: true })); 
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }, phone);
          console.log(`✅ [Mobile] Phone filled: ${phone}`);
          await this.clickNextButton('.next-btn4, .next-btn5, .next-btn');
        }
      } catch (e) {
        console.warn('⚠️ [Mobile] Phone check skipped:', e.message);
      }

      // ===== STEP 4: ADAPTIVE MOBILE SUBMIT SCAN =====
      console.log('🔘 [Mobile] Scanning for additional dynamic steps...');
      for (let i = 0; i < 3; i++) {
        await this.waitForSpinner();

        const extraBtn = this.page.locator('#submitBtn, .next-btn6.submitBtn, .next-btn7.submitBtn, .next-btn-1, button:has-text("NEXT"), button:has-text("Submit"), button:has-text("Continue")').first();
        if (await extraBtn.isVisible({ timeout: 2000 })) {
          const btnClass = await extraBtn.getAttribute('class').catch(() => 'btn');
          console.log(`✅ [Mobile] Extra submit/next button found (${btnClass}), clicking (Attempt ${i + 1})...`);
          await extraBtn.tap().catch(() => extraBtn.click()).catch(async () => {
            await extraBtn.evaluate(node => node.click());
          });
          await this.page.waitForTimeout(2000);
        }
      }

    } catch (err) {
      console.error('❌ [Mobile] Error during mobile form filling:', err.message);
      throw err;
    }
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
      console.warn(`⚠️ [Mobile] Button selector ${selector} action failed:`, e.message);
    }
  }

  /**
   * Triggers the final submission block if not already submitted
   */
  async submitForm() {
    console.log('🔘 [Mobile] Submitting form');
    try {
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

    } catch (error) {
      console.warn('⚠️ [Mobile] Submit timeout/error, checking URL status...');
      await this.page.waitForTimeout(4000);
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
  extractLeadId(url) {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      const leadId = params.get('transaction_id')
        || params.get('leadid')
        || params.get('lead_id')
        || params.get('reqid')
        || params.get('id')
        || null;

      if (leadId) {
        console.log('✅ [Mobile] Extracted Lead ID:', leadId);
      } else {
        console.warn('⚠️ [Mobile] No Lead ID found in URL');
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

  getPageOrigin() {
    return this.originalUrl;
  }
}

module.exports = MobileFormPage;
