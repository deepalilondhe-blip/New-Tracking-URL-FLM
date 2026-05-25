require('dotenv').config();
const flmAgent = require('../utils/flmAgent');

class FormPage {
  constructor(page) {
    this.page = page;
    this.originalUrl = null;
    this.step1 = '';
    this.step2 = '';
    this.step3 = '';
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

  async navigate(url) {
    console.log(`🔗 Navigating to: ${url}`);
    this.originalUrl = url;

    // Clear cookies/session/storage before each run for a clean state
    await this.page.context().clearCookies();
    await this.page.context().clearPermissions();
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.warn(`⚠️ Navigation warning: ${e.message}. Continuing with page execution...`);
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    // Clear storage after navigation to avoid SecurityError on blank pages
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
      console.warn('⚠️ Could not clear localStorage/sessionStorage:', e.message);
    }

    console.log('✅ Page loaded successfully');
  }

    // ==================================================
    // 🧠 [INTELLIGENCE] DETERMINISTIC OPTION ROTATION
    // ==================================================
    async handleChoiceRotation(choicesSelector, runIndex) {
        const choices = await this.page.$$(choicesSelector);
        if (choices.length > 0) {
            const indexToSelect = runIndex % choices.length;
            const target = choices[indexToSelect];
            const text = await target.innerText();
            console.log(`🔘 [Rotation] Selecting Option ${indexToSelect + 1}: "${text}"`);
            await target.click();
            return text;
        }
        return null;
    }

  async fillForm(data = {}) {
    console.log('📝 Starting multi-step form filling process...');
    const { sliderAmount, state, firstName, lastName, email, phone, runIndex } = data;
    this.runIndex = runIndex || 0;
    const defaultSliderAmount = sliderAmount || '20000';
    const defaultState = state || 'RI';
    const defaultFirstName = firstName || 'ckmtestpixel';
    const defaultLastName = lastName || 'ckmtestpixel';
    const defaultEmail = email || 'ckmtestpixel@gmail.com';
    const defaultPhone = phone || '4012473406';

    try {
      let taxDebtSelect;
      // ===== STEP 1: DEBT AMOUNT / SLIDER =====
      await this.waitForSpinner();
      console.log(`🔘 Step 1: Handling Debt Amount (${sliderAmount})`);
      try {
        let selected = false;

        // Check for jQuery UI Slider (#slider)
        const jquerySlider = this.page.locator('#slider').first();
        if (await jquerySlider.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log('🔘 Found jQuery UI Slider #slider. Setting value via jQuery and DOM evaluation...');
          await this.page.evaluate((amount) => {
            const cleanVal = parseInt(amount.replace(/[$,\s]/g, ''));
            const $ = window.jQuery || window.$;
            if ($ && $.fn && $.fn.slider) {
              const $slider = $('#slider');
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
          console.log(`✅ Set jQuery UI Slider #slider to ${sliderAmount}`);
          selected = true;
          this.selectedSliderAmount = sliderAmount;
          await this.page.waitForTimeout(500);
        }

        // Check for standard select dropdown (Prioritize for pages like FSI-PPC2)
        taxDebtSelect = this.page.locator('select#tax_debt, select[name="tax_debt"], .debt-select').first();
        if (await taxDebtSelect.isVisible({ timeout: 2000 })) {
          console.log('🔘 Found dropdown menu. Performing visible selection...');
          await taxDebtSelect.scrollIntoViewIfNeeded();
          await taxDebtSelect.focus();
          
          const selectedData = await taxDebtSelect.evaluate((node, amount) => {
            const rawVal = parseInt(amount.replace(/[$,\s]/g, ''));
            const options = Array.from(node.options);
            
            // Find best matching option based on buckets
            const match = options.find(opt => {
                const text = opt.text.toLowerCase();
                if (rawVal < 10000 && text.includes('9,999')) return true;
                if (rawVal >= 10000 && rawVal < 20000 && (text.includes('19,999') || text.includes('10,000'))) return true;
                if (rawVal >= 20000 && rawVal < 50000 && (text.includes('50,000') || text.includes('20,000'))) return true;
                if (rawVal >= 50000 && (text.includes('50,000 or more') || text.includes('more'))) return true;
                return false;
            }) || options[options.length - 1];

            node.value = match.value;
            node.dispatchEvent(new Event('change', { bubbles: true }));
            return { value: match.value, text: match.text };
          }, sliderAmount);

          this.selectedSliderAmount = selectedData.text;
          selected = true;
          console.log(`✅ Selected dropdown option: "${selectedData.text}"`);
          await this.page.waitForTimeout(500);
        }

        // Check for range input slider
        const rangeInput = this.page.locator('input[type="range"]').first();
        if (await rangeInput.isVisible({ timeout: 1500 })) {
          console.log('🔘 Found range input slider. Setting value via DOM evaluation...');
          await rangeInput.evaluate((node, amountVal) => {
            const cleanVal = amountVal.replace(/[$,\s]/g, '');
            node.value = cleanVal;
            node.dispatchEvent(new Event('change', { bubbles: true }));
            node.dispatchEvent(new Event('input', { bubbles: true }));
          }, sliderAmount);
          console.log(`✅ Set range input slider to ${sliderAmount}`);
          selected = true;
          await this.page.waitForTimeout(300);
        }

        if (!selected) {
          const amountStr = sliderAmount.replace(/,/g, '');
          const amountNum = parseInt(amountStr);
          let amountK;

          // Handle exact 1000 value properly (do not round for small values)
          if (amountNum === 1000) {
            amountK = 1;
          } else {
            amountK = Math.round(amountNum / 1000);
          }

          // Dynamically create selectors for actual slider amount
          const sliderSelectors = [
            `span:has-text("$${amountK},000")`,
            `span:has-text("$${amountK}k")`,
            `span:has-text("$${amountK},000+")`,
            `label:has-text("$${amountK},000")`,
            `div:has-text("$${amountK},000")`,
            `.slider-option:has-text("${amountK},000")`,
            `[data-value="${amountStr}"]`,
            `[data-amount="${amountStr}"]`,
            `span:has-text("$1,000")`,
            `span:has-text("$1k")`
          ];

          for (const selector of sliderSelectors) {
            const option = this.page.locator(selector).first();
            if (await option.isVisible({ timeout: 1500 })) {
              await option.click({ force: true });
              console.log(`✅ Selected debt amount via selector: ${selector}`);
              selected = true;
              break;
            }
          }

          if (!selected) {
            // Last resort: find any element containing the actual amount
            const fallbackRegex = new RegExp(`${amountK}.*000`);
            const fallback = this.page.locator('span, div, label, li').filter({ hasText: fallbackRegex }).first();
            if (await fallback.isVisible({ timeout: 1500 })) {
              await fallback.click({ force: true });
              console.log('✅ Selected debt amount via regex fallback');
              selected = true;
            }
          }

          if (!selected) {
            const debtInput = this.page.locator('#debt_amount, input[name="debt_amount"]').first();
            if (await debtInput.isVisible({ timeout: 1500 })) {
              await debtInput.fill(amountStr);
              console.log(`✅ Selected debt_amount input with ${amountStr}`);
            }
          }
        }

        // Live-extract the actual selected/filled slider value directly from the webpage DOM
        try {
          taxDebtSelect = this.page.locator('select#tax_debt').first();
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
                if (val) this.selectedSliderAmount = val;
              } else {
                this.selectedSliderAmount = sliderAmount;
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Could not live-extract slider amount:', err.message);
          this.selectedSliderAmount = sliderAmount;
        }
      } catch (e) {
        console.warn('⚠️ Could not select debt amount:', e.message);
      }
      await this.clickNextButton('.next-btn1, .btn-next');
      const runIndex = data.runIndex || 0;

      // ==================================================
      // 🔹 DYNAMIC CHOICE/INTERMEDIATE STEPS TRAVERSAL
      // ==================================================
      // This loops through any visible intermediate question/choice screens
      // until we land on the State or Contact form page!
      let safetyCounter = 0;
      let choiceStepCount = 0;
      while (safetyCounter < 8) {
        await this.waitForSpinner();
        const isStateVisible = await this.page.locator('#state:visible, select#state:visible').first().isVisible({ timeout: 1000 }).catch(() => false);
        const isContactVisible = await this.page.locator('#first_name:visible, input[name="first_name"]:visible').first().isVisible({ timeout: 1000 }).catch(() => false);

        if (isStateVisible || isContactVisible) {
          console.log('✅ Reached a recognized terminal step (State or Contact). Stopping dynamic traversal.');
          break;
        }

        // Check if there are any custom/intermediate buttons visible and click them!
        const choiceSelectors = [
          '.custom-btn:visible', '.choice-btn:visible', '.choice-box:visible', '.btn-choice:visible',
          '.form-choice:visible', '.debt-option:visible', 'label.custom-control-label:visible',
          '.option-button:visible', '.selection-item:visible', '.quiz-option:visible', '.step-choice:visible',
          '.debt-type:visible', '.quiz-btn:visible', 'div[role="button"]:visible', 'button:not([type="submit"]):visible'
        ];

        let clickedChoice = false;
        for (const selector of choiceSelectors) {
          const text = await this.handleChoiceRotation(selector, runIndex);
          if (text) {
            choiceStepCount++;
            if (choiceStepCount === 1) this.step1 = text;
            else if (choiceStepCount === 2) this.step2 = text;
            else if (choiceStepCount === 3) this.step3 = text;
            clickedChoice = true;
            break;
          }
        }

        if (!clickedChoice) {
          // If no custom button is found, check if a generic Next button is visible to skip/advance
          const nextBtn = this.page.locator('.btn-next:visible, .next-btn:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible').first();
          if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('🔘 No choices found, but NEXT button is visible. Clicking to advance...');
            await nextBtn.click().catch(() => { });
            await this.page.waitForTimeout(400);
          } else {
            console.log('⚠️ No visible dynamic choices or next buttons on this step. Ending traversal.');
            break;
          }
        }
        safetyCounter++;
      }

      // ===== STATE STEP (If present) =====
      await this.waitForSpinner();
      const stateSelect = this.page.locator('#state:visible, select#state:visible, select[name="state"]:visible').first();
      if (await stateSelect.isVisible({ timeout: 2000 })) {
        console.log('🔘 Step: Selecting State');
        try {
          const selectedState = await this.page.evaluate(({ stateSelectSelector, runIndex, defaultState }) => {
            const node = document.querySelector(stateSelectSelector);
            if (node && node.options.length > 1) {
              const validOptions = Array.from(node.options).filter(opt => {
                const val = opt.value.trim();
                const txt = opt.text.toLowerCase();
                return val !== "" && !txt.includes("select") && !txt.includes("choose");
              });

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

          console.log(`✅ Selected state dynamically: "${selectedState}"`);
          if (choiceStepCount < 3) {
            this.step3 = selectedState || state;
            console.log(`📝 step3 column set to State: "${this.step3}"`);
          }
        } catch (e) {
          console.warn('⚠️ State selection DOM evaluation failed:', e.message);
        }
        await this.clickNextButton('.next-btn, .next-btn2, .btn-next');
      }

      // ===== POST-STATE DYNAMIC STEPS (If any) =====
      await this.waitForSpinner();
      let postStateCounter = 0;
      while (postStateCounter < 3) {
        const isContactVisible = await this.page.locator('#first_name:visible, input[name="first_name"]:visible').first().isVisible({ timeout: 1000 }).catch(() => false);
        if (isContactVisible) break;

        const nextBtn = this.page.locator('.btn-next:visible, .next-btn:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible').first();
        if (await nextBtn.isVisible({ timeout: 1000 })) {
          console.log('🔘 Advancing past post-state step...');
          await nextBtn.click().catch(() => { });
          await this.page.waitForTimeout(400);
        } else {
          break;
        }
        postStateCounter++;
      }

      // ===== STEP: NAME & CONTACT INFO (Unbreakable Dynamic Step-based Loop) =====
      await this.waitForSpinner();
      console.log('🔘 Filling Contact Info (Dynamic Loop)...');

      let contactSafetyCounter = 0;
      let lastFilledState = "";
      while (contactSafetyCounter < 10) {
        await this.waitForSpinner();

        let filledSomething = false;

        // First Name
        const fName = this.page.locator('#first_name:visible, input[name="first_name"]:visible, input[placeholder*="First Name" i]:visible').first();
        if (await fName.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = await fName.inputValue().catch(() => '');
          if (!currentVal || currentVal !== firstName) {
            await fName.click();
            await fName.fill(firstName);
            await this.page.keyboard.press('Tab');
            console.log(`✅ Filled First Name: ${firstName}`);
            filledSomething = true;
          }
        }

        // Last Name
        const lName = this.page.locator('#last_name:visible, input[name="last_name"]:visible, input[placeholder*="Last Name" i]:visible').first();
        if (await lName.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = await lName.inputValue().catch(() => '');
          if (!currentVal || currentVal !== lastName) {
            await lName.click();
            await lName.fill(lastName);
            await this.page.keyboard.press('Tab');
            console.log(`✅ Filled Last Name: ${lastName}`);
            filledSomething = true;
          }
        }

        // Email
        const emailField = this.page.locator('#email:visible, #email_address:visible, input[name="email"]:visible, input[name="email_address"]:visible, input[type="email"]:visible, input[placeholder*="Email" i]:visible').first();
        if (await emailField.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = await emailField.inputValue().catch(() => '');
          if (!currentVal || currentVal !== email) {
            await emailField.click();
            await emailField.fill(email);
            await this.page.keyboard.press('Tab');
            console.log(`✅ Filled Email: ${email}`);
            filledSomething = true;
          }
        }

        // Phone
        const phoneField = this.page.locator('#primary_phone:visible, #phone:visible, #phone_home:visible, input[name="phone"]:visible, input[name="phone_home"]:visible, input[name="primary_phone"]:visible, input[type="tel"]:visible').first();
        if (await phoneField.isVisible({ timeout: 500 }).catch(() => false)) {
          const currentVal = await phoneField.inputValue().catch(() => '');
          if (!currentVal || currentVal !== phone) {
            await phoneField.click();
            await phoneField.fill(phone);
            await this.page.keyboard.press('Tab');
            console.log(`✅ Filled Phone: ${phone}`);
            filledSomething = true;
          }
        }

        // Click next/submit button if visible on this contact sub-step
        const nextBtn = this.page.locator('.btn-next:visible, .next-btn:visible, .next-btn3:visible, .next-btn4:visible, .next-btn5:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible, button:has-text("Submit"):visible, button:has-text("Continue"):visible, input[type="submit"]:visible, .emailbtn:visible, .namebtn:visible').first();

        if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          const btnText = await nextBtn.textContent().catch(() => 'Next');
          const currentUrl = this.page.url();
          const currentState = `${currentUrl}_${btnText}`;

          if (!filledSomething && currentState === lastFilledState) {
            console.log('🔘 Contact form stable (no new fields to fill). Exiting contact loop.');
            break;
          }

          lastFilledState = currentState;
          console.log(`🔘 Clicking active contact NEXT/SUBMIT button...`);
          await nextBtn.click({ force: true }).catch(() => { });
          await this.page.waitForTimeout(400);
        } else {
          console.log('🔘 No active contact NEXT/SUBMIT button visible. Exiting loop.');
          break;
        }

        contactSafetyCounter++;
      }

      // ===== STEP 6: SOURCE / HOW DID YOU HEAR (If present) =====
      await this.waitForSpinner();
      const sourceSelect = this.page.locator('#source, select[name="source"], select[name="hear_about_us"], select[name="how_did_you_hear"]').first();
      if (await sourceSelect.isVisible({ timeout: 3000 })) {
        console.log('🔘 Step 6: Selecting Source (Other)');
        try {
          await sourceSelect.selectOption({ label: 'Other' });
        } catch (e) {
          await sourceSelect.selectOption({ index: 1 });
        }
        console.log('✅ Source selected');
        await this.clickNextButton('.next-btn6.submitBtn, .next-btn6, button:has-text("NEXT")');
      }

      // ===== ADAPTIVE SUBMIT LOOP (For multi-page submits) =====
      console.log('🔘 Checking for additional submit/next buttons...');
      for (let i = 0; i < 4; i++) {
        await this.waitForSpinner();

        // Special handling for Station input field (often appears after Source)
        const stationInput = this.page.locator('input[name="station"], input[placeholder*="station" i], input[placeholder*="searching" i]').first();
        if (await stationInput.isVisible({ timeout: 2000 })) {
          console.log('🔘 Step: Filling Station Info');
          await stationInput.click();
          await stationInput.fill('Test Station');
          await this.page.keyboard.press('Tab');
        }

        const extraBtn = this.page.locator('#submitBtn, .next-btn6.submitBtn, .next-btn7.submitBtn, .next-btn8.submitBtn, button:has-text("NEXT"), button:has-text("Submit"), button:has-text("Continue")').first();
        if (await extraBtn.isVisible({ timeout: 3000 })) {
          console.log(`✅ Extra submit button found (${await extraBtn.getAttribute('class')}), clicking (Attempt ${i + 1})...`);
          await extraBtn.click().catch(async () => {
            await extraBtn.evaluate(node => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
          });
          await this.page.waitForTimeout(2500);
        }
      }

    } catch (error) {
      console.error('❌ Error during form filling:', error.message);
      throw error;
    }
  }

  async waitForSpinner() {
    try {
      // Wait for any common loading indicators to disappear
      const spinner = this.page.locator('.spinner, .loading, #loading, .overlay, .loader, .loading-overlay').first();
      if (await spinner.isVisible({ timeout: 1000 })) {
        console.log('⏳ Waiting for loading spinner to disappear...');
        await spinner.waitFor({ state: 'hidden', timeout: 15000 });
      }
    } catch (e) { }
  }

  async clickNextButton(selector) {
    try {
      const btn = this.page.locator(selector).first();
      if (await btn.isVisible({ timeout: 5000 })) {
        console.log(`🔘 Attempting to click ${selector}`);
        await btn.click({ timeout: 5000 }).catch(async () => {
          console.log('⚠️ Standard click failed, using dispatchEvent...');
          await btn.evaluate(node => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        });
        console.log(`✅ Clicked ${selector}`);
        await this.page.waitForTimeout(1500);
      } else {
        // Fallback to generic next if specific class not found
        const genericNext = this.page.locator('button:has-text("NEXT"), button:has-text("Next"), a:has-text("NEXT"), a:has-text("Next"), div:has-text("NEXT"), div:has-text("Next"), .next-btn, .next-btn1, .next-btn2, .next-btn3, .next-btn4, .next-btn5, .btn-next').first();
        if (await genericNext.isVisible({ timeout: 2000 })) {
          console.log('🔘 Clicking generic NEXT button');
          await genericNext.click().catch(async () => {
            await genericNext.evaluate(node => node.click());
          });
          console.log('✅ Clicked generic NEXT button');
          await this.page.waitForTimeout(1500);
        }
      }
    } catch (e) {
      console.warn(`⚠️  Button ${selector} not found. Consulting FLM Agent for suggestions...`);
      const suggestion = await flmAgent.suggestFix(this.page, 'Next button');
      if (suggestion) {
        console.warn(`🤖 [FLM Agent] POTENTIAL FIX DISCOVERED: ${suggestion}`);
        console.warn(`🔔 [Manual Approval Required] Please update the selector in FormPage.js to use: ${suggestion}`);
      } else {
        console.warn(`❌ [FLM Agent] No suggestion available for this failure.`);
      }
      throw new Error(`Navigation button ${selector} missing. FLM Agent suggestion provided in logs.`);
    }
  }

  async submitForm() {
    console.log('🔘 Submitting form');

    try {
      const submitButtons = [
        this.page.locator('#submitBtn').first(),
        this.page.locator('button:has-text("NEXT")').first(),
        this.page.locator('.next-btn6.submitBtn').first(),
        this.page.locator('.next-btn8.submitBtn').first(),
        this.page.locator('#fakeNextBtn').first(),
        this.page.locator('.emailbtn').first(),
        this.page.locator('text=Get My Free Quote >>').first(),
        this.page.locator('text=Submit').first(),
        this.page.locator('text=Continue').first(),
        this.page.locator('button[type="submit"]').first()
      ];

      for (const btn of submitButtons) {
        if (await btn.isVisible({ timeout: 2000 })) {
          console.log('✅ Submit button found, clicking...');
          await btn.click();
          break;
        }
      }
      
      // Last resort: FLM Agent Self-Healing for Submit (Manual Approval Mode)
      console.warn('⚠️ Standard submit buttons not found, consulting FLM Agent...');
      const suggestion = await flmAgent.suggestFix(this.page, 'Submit button');
      if (suggestion) {
        console.warn(`🤖 [FLM Agent] POTENTIAL SUBMIT FIX DISCOVERED: ${suggestion}`);
        console.warn(`🔔 [Manual Approval Required] Update FormPage.js submit block with: ${suggestion}`);
      }

    } catch (e) {
      console.warn('⚠️ Form submission failure analysis complete.');
    }
  }

  async getThankYouUrl() {
    console.log('⏳ Waiting for final redirect to Thank You page...');
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
            console.log('✅ Targeted final redirect URL achieved!');
            break;
          }
        } catch (e) { }
        await this.page.waitForTimeout(1000); // Wait 1 second before checking again
      }
    } catch (e) {
      console.warn('⚠️ Error during thank you page polling:', e.message);
    }
    const finalUrl = this.page.url();
    console.log('✅ Final Thank You URL:', finalUrl);
    return finalUrl;
  }

  async extractLeadId(url) {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      console.log('📋 [Diagnostic] Full Thank You URL Parameters:', JSON.stringify(Object.fromEntries(params.entries())));

      // Priority 1: URL Parameters
      let leadId = params.get('transaction_id')
        || params.get('leadid')
        || params.get('lead_id')
        || params.get('ckm_id')
        || params.get('tid')
        || params.get('reqid')
        || params.get('request_id')
        || params.get('id');

      // Priority 2: DOM DEEP-SCAN (Hidden inputs, Text patterns, Hex-8, GUIDs)
      if (!leadId || (leadId.length !== 8 && leadId.length < 10)) {
        console.log('🔍 [DOM Deep-Scan] URL ID missing or non-standard. Searching for Hex-8 or GUID IDs...');
        const domId = await this.page.evaluate(() => {
          // 1. Search for 8-character Hex patterns (like 27D65758)
          const html = document.documentElement.innerHTML;
          const hex8Match = html.match(/\b[A-F0-9]{8}\b/i);
          if (hex8Match) return hex8Match[0];

          // 2. Search for GUID patterns (32 chars hex)
          const guidMatch = html.match(/[a-f0-9]{32}/i) || html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
          if (guidMatch) return guidMatch[0];

          // 3. Search for hidden inputs with "id" in their name
          const inputs = Array.from(document.querySelectorAll('input[type="hidden"]'));
          for (const input of inputs) {
            if (input.name.toLowerCase().includes('id') && input.value.length >= 8) return input.value;
          }

          const bodyText = document.body.innerText;
          const longIdMatch = bodyText.match(/(?:ID|Transaction|Ref|Conf)\s*[:#-]?\s*([A-Z0-9-]{8,40})/i);
          return longIdMatch ? longIdMatch[1] : null;
        }).catch(() => null);

        if (domId) leadId = domId;
      }

      if (leadId) {
        console.log('✅ Extracted Lead ID:', leadId);
      } else {
        console.warn('⚠️ No Lead ID found in URL or DOM.');
      }

      return leadId;
    } catch (e) {
      console.error('❌ Error extracting lead ID:', e.message);
      return null;
    }
  }

  getPageOrigin() {
    return this.originalUrl;
  }
}

module.exports = FormPage;