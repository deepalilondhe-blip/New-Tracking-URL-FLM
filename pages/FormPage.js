const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const aiAgent = require('../utils/flmAgent');

class FormPage {
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
    this.redirectedUrl = this.page.url();
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
    const { brandId, sliderAmount, targetMin, targetMax, state, firstName, lastName, email, phone, isTraLink } = data;
    this.brandId = brandId || '';
    const runIndex = data.runIndex || 0;
    this.runIndex = runIndex;
    this.isTraLink = isTraLink || false;
    const defaultSliderAmount = sliderAmount || '20000';
    const defaultState = state || 'RI';
    const defaultFirstName = firstName || 'ckmtestpixel';
    const defaultLastName = lastName || 'ckmtestpixel';
    const defaultEmail = email || 'ckmtestpixel@gmail.com';
    const defaultPhone = phone || '4012473406';

    try {
      let taxDebtSelect;
      // ===== STEP 1: DEBT AMOUNT / SLIDER =====
      if (this.brandId === 'fth-questionnaire') {
        console.log('🔘 [FTH Questionnaire] Skipping Step 1 slider selection (answered dynamically during steps).');
      } else {
        await this.waitForSpinner();
        console.log(`🔘 Step 1: Handling Debt Amount (${sliderAmount})`);
        try {
          let selected = false;

        // Check for jQuery UI Slider (#slider, #slider2, .ui-slider)
        const jquerySlider = this.page.locator('#slider, #slider2, .ui-slider').first();
        if (await jquerySlider.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log('🔘 Found jQuery UI Slider #slider. Setting value via jQuery and DOM evaluation...');
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
          // ✅ Store the clean numeric value we actually set (NOT raw pixel position)
          const cleanNumericVal = parseInt(sliderAmount.replace(/[$,\s]/g, ''));
          this.selectedSliderAmount = cleanNumericVal.toLocaleString();
          console.log(`✅ Set jQuery UI Slider #slider to ${this.selectedSliderAmount}`);
          selected = true;
          await this.page.waitForTimeout(500);
        }

        // Check for standard select dropdown (Prioritize for pages like FSI-PPC2)
        taxDebtSelect = this.page.locator('select#tax_debt, select[name="tax_debt"], .debt-select').first();
        if (await taxDebtSelect.isVisible({ timeout: 1500 }).catch(() => false)) {
          const optionsLocator = taxDebtSelect.locator('option');
          const count = await optionsLocator.count().catch(() => 0);
          
          if (count > 0) {
            // Check for exact text match or clean numeric range match first
            let exactMatchOpt = null;
            const cleanSlider = sliderAmount.toLowerCase().replace(/[$,\s]/g, '');
            for (let i = 0; i < count; i++) {
              const opt = optionsLocator.nth(i);
              const text = await opt.textContent().catch(() => '');
              const value = await opt.getAttribute('value').catch(() => '');
              const cleanText = text.toLowerCase().replace(/[$,\s]/g, '').replace(/k/g, '000').replace(/m/g, '000000');
              if (text.trim().toLowerCase() === sliderAmount.trim().toLowerCase() || cleanText === cleanSlider) {
                exactMatchOpt = { text: text.trim(), value, index: i };
                break;
              }
            }
            if (exactMatchOpt) {
              console.log(`✅ [Exact Match] Found dropdown option matching "${sliderAmount}": "${exactMatchOpt.text}"`);
              await taxDebtSelect.evaluate(el => {
                el.style.outline = '5px solid #FF1493';
                el.style.border = '2px solid #FF1493';
                el.style.backgroundColor = '#FFE4E1';
                el.style.boxShadow = '0 0 20px #FF1493';
                el.focus();
              }).catch(() => {});
              await taxDebtSelect.click({ force: true }).catch(() => {});
              await this.page.waitForTimeout(1000);
              await taxDebtSelect.selectOption(exactMatchOpt.value || { index: exactMatchOpt.index });
              await taxDebtSelect.evaluate(el => {
                el.style.backgroundColor = '#ADFF2F';
                el.style.outline = '5px solid #32CD32';
                el.style.boxShadow = '0 0 20px #32CD32';
              }).catch(() => {});
              this.selectedSliderAmount = exactMatchOpt.text;
              selected = true;
            }

            if (!selected) {
              console.log(`🔍 [Dropdown Scanner] Scanning ${count} dropdown options against daily range: ${targetMin} - ${targetMax}`);
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
                
                // Only push options that overlap with the daily target range
                if ((optMin <= targetMax && optMax >= targetMin) || (targetMin === undefined)) {
                  validOptions.push({ text: text.trim(), value, index: i });
                }
              }
              
              if (validOptions.length > 0) {
                const selectedOpt = validOptions[runIndex % validOptions.length];
                console.log(`✅ [Rotational Logic] Selected dropdown choice: "${selectedOpt.text}"`);
                await taxDebtSelect.evaluate(el => {
                  el.style.outline = '5px solid #FF1493';
                  el.style.border = '2px solid #FF1493';
                  el.style.backgroundColor = '#FFE4E1';
                  el.style.boxShadow = '0 0 20px #FF1493';
                  el.focus();
                }).catch(() => {});
                await taxDebtSelect.click({ force: true }).catch(() => {});
                await this.page.waitForTimeout(3000);
                await taxDebtSelect.selectOption(selectedOpt.value || { index: selectedOpt.index });
                await taxDebtSelect.dispatchEvent('change').catch(() => {});
                await taxDebtSelect.evaluate(el => {
                  el.style.backgroundColor = '#ADFF2F'; // Light green highlight on success
                  el.style.outline = '5px solid #32CD32';
                  el.style.boxShadow = '0 0 20px #32CD32';
                }).catch(() => {});
                await this.page.waitForTimeout(3000);
                this.selectedSliderAmount = selectedOpt.text;
                selected = true;
              } else {
                // Fallback if URL doesn't support the high limits (e.g. Wednesday 100k target but dropdown maxes at 50k)
                console.log('⚠️ [Dropdown Scanner] No options match the daily range. Attempting fallback to nearest available max tier...');
                await taxDebtSelect.evaluate(el => {
                  el.style.outline = '5px solid #FF8C00'; // Orange for fallback
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
        }

        // Check for range input slider
        const rangeInput = this.page.locator('input[type="range"]').first();
        if (await rangeInput.isVisible({ timeout: 1500 })) {
          console.log('🔘 Found range input slider. Setting value via DOM evaluation...');
          // Parse clean value and round to nearest 1000 for a clean display
          const rangeCleanNum = Math.round(parseInt(sliderAmount.replace(/[$,\s]/g, '')) / 1000) * 1000 || 1000;
          await rangeInput.evaluate((node, val) => {
            node.value = val;
            node.dispatchEvent(new Event('change', { bubbles: true }));
            node.dispatchEvent(new Event('input', { bubbles: true }));
          }, String(rangeCleanNum));
          // ✅ Store clean rounded value immediately — prevents live-extract from overwriting with raw pixel value (e.g. 10447)
          this.selectedSliderAmount = rangeCleanNum.toLocaleString();
          console.log(`✅ Set range input slider to ${this.selectedSliderAmount}`);
          selected = true;
          await this.page.waitForTimeout(300);
        }

        if (!selected) {
          const amountStr = sliderAmount.replace(/,/g, '');
          const amountNum = parseInt(amountStr);
          let amountK;

          // If sliderAmount is a custom non-numeric label (e.g. "Less than 9999"), search by text
          if (isNaN(amountNum)) {
            console.log(`🔍 [Custom Option Search] Looking for option with text: "${sliderAmount}"`);
            const customSelectors = [
              `span:has-text("${sliderAmount}")`,
              `label:has-text("${sliderAmount}")`,
              `div:has-text("${sliderAmount}")`,
              `button:has-text("${sliderAmount}")`,
              `p:has-text("${sliderAmount}")`,
              `li:has-text("${sliderAmount}")`
            ];
            for (const selector of customSelectors) {
              const option = this.page.locator(selector).first();
              if (await option.isVisible({ timeout: 1500 }).catch(() => false)) {
                await option.click({ force: true }).catch(() => {});
                console.log(`✅ Selected custom option via selector: ${selector}`);
                this.selectedSliderAmount = sliderAmount;
                selected = true;
                break;
              }
            }
          }

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
            // Find all visible options on the page (spans, divs, labels, buttons)
            console.log(`🔍 [Smart Choice Scanner] Scanning for options matching daily range: ${targetMin} - ${targetMax}`);
            
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
              console.log(`✅ [Rotational Logic] Selected Smart Choice option: "${matchData.text}"`);
              this.selectedSliderAmount = matchData.text;
              selected = true;
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
            console.log('⚠️ [Desktop] Attempting FTH-specific card select fallback...');
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
                await option.click({ force: true });
                let textVal = await option.textContent().catch(() => '');
                textVal = textVal ? textVal.trim() : '';
                this.selectedSliderAmount = (textVal && textVal.length < 50) ? textVal : sliderAmount;
                console.log(`✅ [Desktop] Selected FTH fallback choice card: ${selector} ("${this.selectedSliderAmount}")`);
                selected = true;
                break;
              }
            }
          }

          if (!selected) {
            const debtInput = this.page.locator('#debt_amount, input[name="debt_amount"]').first();
            if (await debtInput.isVisible({ timeout: 1500 })) {
              await debtInput.fill(amountStr);
              console.log(`✅ Selected debt_amount input with ${amountStr}`);
              selected = true;
            }
          }
        }

        // Live-extract the actual selected/filled slider value directly from the webpage DOM
        // ✅ SKIP if we already captured a clean value (e.g. via exact-match or custom option)
        if (this.selectedSliderAmount) {
          console.log(`✅ [Live-Extract] Keeping already-captured slider value: "${this.selectedSliderAmount}" — skipping DOM re-read.`);
        } else {
          try {
            taxDebtSelect = this.page.locator('select#tax_debt, select[name="tax_debt"], select[name="debt_amount"], select.debt-select, select.taxval').first();
            if (await taxDebtSelect.isVisible().catch(() => false)) {
              const selectedText = await taxDebtSelect.evaluate(node => {
                const opt = node.options[node.selectedIndex];
                return opt ? opt.text : '';
              }).catch(() => '');
              if (selectedText) {
                this.selectedSliderAmount = selectedText.trim();
                console.log(`✅ [Live-Extract] Captured from dropdown: "${this.selectedSliderAmount}"`);
              }
            } else {
              const rangeInput = this.page.locator('input[type="range"]').first();
              if (await rangeInput.isVisible().catch(() => false)) {
                const val = await rangeInput.inputValue().catch(() => '');
                if (val) {
                  this.selectedSliderAmount = val;
                  console.log(`✅ [Live-Extract] Captured from range input: "${this.selectedSliderAmount}"`);
                }
              } else {
                this.selectedSliderAmount = sliderAmount;
                console.log(`✅ [Live-Extract] Fallback to sliderAmount param: "${this.selectedSliderAmount}"`);
              }
            }
          } catch (err) {
            console.warn('⚠️ Could not live-extract slider amount:', err.message);
            this.selectedSliderAmount = sliderAmount;
          }
        }

        // 🛡️ PHONE-NUMBER CONTAMINATION GUARD
        // If selectedSliderAmount looks like a phone number or site widget text
        // (e.g. "POWERED BY: 844-329-3507"), discard it and use the original sliderAmount
        const isPhoneContaminated = (val) => {
          if (!val) return false;
          const v = val.toString().trim();
          if (v.toUpperCase().includes('POWERED BY')) return true;
          if (v.toUpperCase().includes('CALL US')) return true;
          if (/^\d{3}[-.\s]\d{3}[-.\s]\d{4}$/.test(v)) return true; // plain phone: 844-329-3507
          if (/\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(v) && v.length > 20) return true; // embedded phone in long text
          return false;
        };
        if (isPhoneContaminated(this.selectedSliderAmount)) {
          console.warn(`⚠️ [Contamination Guard] selectedSliderAmount "${this.selectedSliderAmount}" looks like a phone/widget — resetting to sliderAmount: "${sliderAmount}"`);
          this.selectedSliderAmount = sliderAmount;
        }
      } catch (e) {
        console.warn('⚠️ Could not select debt amount:', e.message);
      }
      await this.syncHiddenDebtFields();
      await this.clickNextButton('.next-btn1, .btn-next');
      }

      // ==================================================
      // 🔹 DYNAMIC CHOICE/INTERMEDIATE STEPS TRAVERSAL
      // ==================================================
      // This loops through any visible intermediate question/choice screens
      // until we land on the State or Contact form page!
      let safetyCounter = 0;
      let choiceStepCount = 0;
      while (safetyCounter < 15) {
        await this.waitForSpinner();

        // 🛡️ MODAL GUARD: Auto-close active bootstrap modals if any appear
        try {
          const activeModalClose = this.page.locator('.modal.show button.close, .modal.show .close, .modal:visible button.close, .modal:visible .close, button[data-dismiss="modal"]:visible, .modal-header .close:visible').first();
          if (await activeModalClose.isVisible({ timeout: 500 }).catch(() => false)) {
            console.log('⚠️ [Modal Guard] Found visible active modal popup! Attempting to close it...');
            await activeModalClose.click({ force: true }).catch(() => {});
            await this.page.waitForTimeout(1000);
          }
        } catch (e) {}

        const isStateVisible = await this.page.locator('#state:visible, select#state:visible').first().isVisible({ timeout: 1000 }).catch(() => false);
        const isContactVisible = await this.page.locator('#first_name:visible, input[name="first_name"]:visible').first().isVisible({ timeout: 1000 }).catch(() => false);

        if (isStateVisible || isContactVisible) {
          console.log('✅ Reached a recognized terminal step (State or Contact). Stopping dynamic traversal.');
          break;
        }

        // Check if there are any custom/intermediate buttons visible and click them!
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
        const activeStepInfo = await this.page.evaluate(() => {
          const el = document.querySelector('.tab-pane.active');
          if (!el) return { id: '', h2: '' };
          const h2 = el.querySelector('h2') ? el.querySelector('h2').innerText.trim().replace(/\s+/g, ' ') : '';
          return { id: el.id || '', h2 };
        });
        const activeStepId = activeStepInfo.id;
        
        let stepOverrideVal = null;
        if (data.stepOverrides && activeStepId && data.stepOverrides[activeStepId]) {
          stepOverrideVal = data.stepOverrides[activeStepId];
          console.log(`🎯 [Override] Active step "${activeStepId}" has strict override: "${stepOverrideVal}"`);
        }

        for (const selector of choiceSelectors) {
          const rawChoices = await this.page.$$(selector);
          const choices = [];
          for (const choice of rawChoices) {
            const isValid = await choice.evaluate(el => {
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0 || el.offsetHeight === 0) {
                return false;
              }
              
              // Ignore footer, header, nav, or modal containers
              const badParent = el.closest('footer, header, nav, .modal, #contactUsModal, #aboutUsModal, .footer, .header, #footer, #header, .links-text, .privacy-policy, .terms-use');
              if (badParent) return false;
              
              // Ignore text representing common policy/footer/navigation options
              const text = (el.innerText || el.textContent || '').trim().toLowerCase();
              const badKeywords = [
                'contact', 'about', 'privacy', 'terms', 'unsubscribe', 'ccpa', 
                'cookie', 'copyright', '©', 'call us', 'call now', 'phone', 
                'tel:', 'powered by', 'optout', 'opt-out', 'previous', 'back',
                'read more', 'learn more', 'show more', 'view more', 'click here',
                'find out more', 'see more', 'more info', 'get help'
              ];
              if (badKeywords.some(kw => text.includes(kw))) {
                return false;
              }
              
              // Ignore empty non-input choices
              if (text.length === 0 && el.tagName !== 'INPUT') {
                return false;
              }
              
              // Ignore choices that are too long to be buttons
              if (text.length > 80) return false;
              
              return true;
            }).catch(() => false);

            if (isValid) {
              choices.push(choice);
            }
          }

          if (choices.length > 0) {
            let target = null;
            let text = '';
            
            if (stepOverrideVal) {
              for (const choice of choices) {
                const txt = await choice.innerText().catch(() => '');
                const cleanTxt = txt.trim().toLowerCase();
                const targetVal = stepOverrideVal.trim().toLowerCase();
                
                const cleanValOnly = targetVal.replace(/[$,\s]/g, '');
                const cleanTxtOnly = cleanTxt.replace(/[$,\s]/g, '');
                
                if (cleanTxt === targetVal || 
                    (cleanValOnly && cleanTxtOnly.includes(cleanValOnly)) ||
                    (targetVal.includes('& more') && cleanTxt.includes('50,000')) ||
                    cleanTxt.includes(targetVal)) {
                  target = choice;
                  text = txt;
                  console.log(`🎯 [Override Match] Found matching choice for "${stepOverrideVal}": "${text}"`);
                  break;
                }
              }
            }
            
            if (stepOverrideVal && !target) {
              continue;
            }
            
            if (!target) {
              const indexToSelect = runIndex % choices.length;
              target = choices[indexToSelect];
              text = await target.innerText().catch(() => '');
              console.log(`🔘 [Rotation] Selecting Option ${indexToSelect + 1}: "${text}"`);
            }
            
            // Click the element
            await target.click({ force: true }).catch(() => {});
            
            choiceStepCount++;
            const cleanTextVal = text ? text.trim() : '';
            if (choiceStepCount >= 1 && choiceStepCount <= 10) {
              this[`step${choiceStepCount}`] = cleanTextVal;
            }
            let isDebtQuestion = true;
            if (this.brandId === 'fth-questionnaire') {
              isDebtQuestion = (activeStepId === 'step3' || 
                                (activeStepInfo && activeStepInfo.h2 && 
                                 (activeStepInfo.h2.toLowerCase().includes('how much do you owe') || 
                                  activeStepInfo.h2.toLowerCase().includes('approximate'))));
            }
            if (isDebtQuestion && cleanTextVal && (cleanTextVal.includes('$') || cleanTextVal.includes('less') || cleanTextVal.includes('more') || cleanTextVal.toLowerCase().includes('under') || cleanTextVal.includes('<') || cleanTextVal.includes('>'))) {
              if (cleanTextVal.includes('4,000') || cleanTextVal.includes('5,000') || cleanTextVal.includes('7,500') || cleanTextVal.includes('7,400') || cleanTextVal.includes('9,999') || cleanTextVal.includes('10,000') || cleanTextVal.includes('19,999') || cleanTextVal.includes('20,000') || cleanTextVal.includes('50,000')) {
                this.selectedSliderAmount = cleanTextVal;
                console.log(`🎯 [FormPage] Live-captured selected slider amount from questionnaire step: "${this.selectedSliderAmount}"`);
              }
            }
            clickedChoice = true;

            // Wait after clicking choice
            console.log('⏳ Waiting 2 seconds after choice selection...');
            await this.page.waitForTimeout(2000);

            // Check if the choice (or options) is still visible (indicating no auto-advance)
            const stillVisible = await target.isVisible().catch(() => false);
            if (stillVisible) {
              console.log('🔘 Choice is still visible (no auto-advance). Clicking NEXT button...');
              const nextBtn = this.page.locator('.next-btn:visible, .btn-next:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible, .next:visible').first();
              if (await nextBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
                await nextBtn.click({ force: true }).catch(() => {});
                console.log('✅ Clicked NEXT button after selecting checkbox/radio.');
                await this.page.waitForTimeout(2000);
              } else {
                console.log('⚠️ NEXT button not visible after checkbox selection.');
              }
            } else {
              console.log('✅ Page auto-advanced after option selection.');
            }
            break;
          }
        }

        if (!clickedChoice) {
          // If no custom button is found, check if a generic Next button is visible to skip/advance
          const nextBtn = this.page.locator('.btn-next:visible, .next-btn:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible, .next:visible').first();
          if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('🔘 No choices found, but NEXT button is visible. Clicking to advance...');
            await nextBtn.click().catch(() => { });
            await this.page.waitForTimeout(2000);
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

          console.log(`✅ Selected state dynamically: "${selectedState}"`);
          const targetStepNum = Math.min(Math.max(choiceStepCount + 1, 2), 10);
          this[`step${targetStepNum}`] = selectedState || state;
          console.log(`📝 step${targetStepNum} column set to State: "${this[`step${targetStepNum}`]}"`);
        } catch (e) {
          console.warn('⚠️ State selection DOM evaluation failed:', e.message);
        }
        await this.clickNextButton('.next-btn, .next-btn2, .btn-next, button:has-text("NEXT"), button:has-text("Next"), .next');
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
        await this.syncHiddenDebtFields();

        // Exit immediately if thank you page is detected
        const currentUrl = this.page.url();
        if (currentUrl.includes('/ty') || currentUrl.includes('/thank-you') || currentUrl.includes('/thankyou') || currentUrl.includes('leadid=') || currentUrl.includes('transaction_id=')) {
          console.log('✅ Thank you page or lead id detected in URL during contact loop. Exiting contact loop.');
          break;
        }

        let filledSomething = false;

        // First Name
        const fName = this.page.locator('#first_name, input[name="first_name"], input[placeholder*="First Name" i]').first();
        if (await fName.isVisible({ timeout: 3000 }).catch(() => false)) {
          const currentVal = await fName.inputValue().catch(() => '');
          if (!currentVal || currentVal !== firstName) {
            await fName.click({ timeout: 3000 }).catch(() => {});
            await fName.fill('');
            await fName.pressSequentially(firstName, { delay: 50 }).catch(() => {});
            await this.page.keyboard.press('Tab').catch(() => {});
            console.log(`✅ Filled First Name: ${firstName}`);
            filledSomething = true;
          }
        }

        // Last Name
        const lName = this.page.locator('#last_name, input[name="last_name"], input[placeholder*="Last Name" i]').first();
        if (await lName.isVisible({ timeout: 3000 }).catch(() => false)) {
          const currentVal = await lName.inputValue().catch(() => '');
          if (!currentVal || currentVal !== lastName) {
            await lName.click({ timeout: 3000 }).catch(() => {});
            await lName.fill('');
            await lName.pressSequentially(lastName, { delay: 50 }).catch(() => {});
            await this.page.keyboard.press('Tab').catch(() => {});
            console.log(`✅ Filled Last Name: ${lastName}`);
            filledSomething = true;
          }
        }

        // Email
        const emailField = this.page.locator('#email, #email_address, input[name="email"], input[name="email_address"], input[type="email"], input[placeholder*="Email" i]').first();
        if (await emailField.isVisible({ timeout: 3000 }).catch(() => false)) {
          const currentVal = await emailField.inputValue().catch(() => '');
          if (!currentVal || currentVal !== email) {
            await emailField.click({ timeout: 3000 }).catch(() => {});
            await emailField.fill('');
            await emailField.pressSequentially(email, { delay: 50 }).catch(() => {});
            await this.page.keyboard.press('Tab').catch(() => {});
            console.log(`✅ Filled Email: ${email}`);
            filledSomething = true;
          }
        }

        // Phone
        const phoneField = this.page.locator('#primary_phone, #phone, #phone_home, input[name="phone"], input[name="phone_home"], input[name="primary_phone"], input[type="tel"]').first();
        if (await phoneField.isVisible({ timeout: 3000 }).catch(() => false)) {
          const currentVal = await phoneField.inputValue().catch(() => '');
          if (!currentVal || currentVal !== phone) {
            await phoneField.click({ timeout: 3000 }).catch(() => {});
            await phoneField.fill('');
            await phoneField.pressSequentially(phone, { delay: 50 }).catch(() => {});
            await this.page.keyboard.press('Tab').catch(() => {});
            console.log(`✅ Filled Phone: ${phone}`);
            filledSomething = true;
          }
        }

        // Click next/submit button if visible on this contact sub-step
        const nextBtn = this.page.locator('.btn-next:visible, .next-btn:visible, .next-btn3:visible, .next-btn4:visible, .next-btn5:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible, button:has-text("Submit"):visible, button:has-text("Continue"):visible, input[type="submit"]:visible, .emailbtn:visible, .namebtn:visible, .next:visible, a:has-text("NEXT"):visible, a:has-text("Next"):visible, .step4btn:visible, .step5btn:visible').first();

        if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          const btnText = await nextBtn.textContent().catch(() => 'Next');
          const currentUrl = this.page.url();
          const currentState = `${currentUrl}_${btnText}`;

          if (!filledSomething && currentState === lastFilledState) {
            console.log('🔘 Contact form stable (no new fields to fill). Exiting contact loop.');
            break;
          }

          lastFilledState = currentState;
          console.log('⏳ Waiting 3 seconds for validation scripts to sync...');
          await this.page.waitForTimeout(3000);
          console.log(`🔘 Clicking active contact NEXT/SUBMIT button...`);
          await nextBtn.click({ force: true }).catch(() => { });
          await this.page.waitForTimeout(1000);
        } else {
          console.log('🔘 No active contact NEXT/SUBMIT button visible. Exiting loop.');
          break;
        }

        contactSafetyCounter++;
      }

      // Check if already navigated to final page before Step 6
      let currentUrl = this.page.url();
      if (currentUrl.includes('/ty') || currentUrl.includes('/thank-you') || currentUrl.includes('/thankyou') || currentUrl.includes('leadid=') || currentUrl.includes('transaction_id=')) {
        console.log('✅ Thank you page detected before Step 6. Exiting form filling.');
        return;
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

        // Check if thank you page/redirect was reached during the loop
        currentUrl = this.page.url();
        if (currentUrl.includes('/ty') || currentUrl.includes('/thank-you') || currentUrl.includes('/thankyou') || currentUrl.includes('leadid=') || currentUrl.includes('transaction_id=')) {
          console.log('✅ Thank you page detected during adaptive submit loop. Exiting loop.');
          break;
        }

        // Special handling for Station input field (often appears after Source)
        const stationInput = this.page.locator('input[name="station"], input[placeholder*="station" i], input[placeholder*="searching" i]').first();
        if (await stationInput.isVisible({ timeout: 2000 })) {
          console.log('🔘 Step: Filling Station Info');
          await stationInput.click({ timeout: 3000 }).catch(() => {});
          await stationInput.fill('Test Station', { timeout: 3000 }).catch(() => {});
          await this.page.keyboard.press('Tab').catch(() => {});
        }

        const extraBtn = this.page.locator('#submitBtn, .next-btn6.submitBtn, .next-btn7.submitBtn, .next-btn8.submitBtn, button:has-text("NEXT"), button:has-text("Submit"), button:has-text("Continue")').first();
        if (await extraBtn.isVisible({ timeout: 3000 })) {
          console.log(`✅ Extra submit button found (${await extraBtn.getAttribute('class').catch(() => 'btn')}), clicking (Attempt ${i + 1})...`);
          await extraBtn.click().catch(async () => {
            await extraBtn.evaluate(node => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
          }).catch(() => {});
          await this.page.waitForTimeout(2500);
        }
      }

    } catch (error) {
      console.error('❌ Error during form filling:', error.message);
      throw error;
    }

    return { extractedSliderAmount: this.selectedSliderAmount };
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
      // Split selectors by comma and append :visible to each to ensure we only target the active visible button
      const visibleSelector = selector.split(',').map(s => `${s.trim()}:visible`).join(', ');
      const btn = this.page.locator(visibleSelector).first();
      const count = await btn.count();
      
      if (count > 0) {
        console.log(`🔘 Clicking active visible button: ${visibleSelector}`);
        await btn.click({ timeout: 5000 }).catch(async () => {
          console.log('⚠️ Standard click failed, using dispatchEvent...');
          await btn.evaluate(node => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        });
        console.log(`✅ Clicked: ${visibleSelector}`);
        await this.page.waitForTimeout(1500);
      } else {
        // Fallback list of specific next buttons evaluated sequentially and strictly with :visible filter
        const genericSelectors = [
          'button:has-text("NEXT"):visible', 'button:has-text("Next"):visible',
          'a:has-text("NEXT"):visible', 'a:has-text("Next"):visible',
          'div:has-text("NEXT"):visible', 'div:has-text("Next"):visible',
          '.next-btn:visible', '.next-btn1:visible', '.next-btn2:visible', '.next-btn3:visible', '.next-btn4:visible', '.next-btn5:visible', '.btn-next:visible', '.next:visible'
        ];
        
        let fallbackClicked = false;
        for (const sel of genericSelectors) {
          const fallbackBtn = this.page.locator(sel).first();
          if (await fallbackBtn.isVisible({ timeout: 1000 })) {
            console.log(`🔘 Clicking fallback button: ${sel}`);
            await fallbackBtn.click({ force: true }).catch(async () => {
              await fallbackBtn.evaluate(node => node.click());
            });
            console.log(`✅ Clicked fallback: ${sel}`);
            await this.page.waitForTimeout(1500);
            fallbackClicked = true;
            break;
          }
        }
        
        if (!fallbackClicked) {
          console.warn(`⚠️ No active visible next button found for selector ${selector}`);
        }
      }
    } catch (e) {
      console.warn(`⚠️  Button ${selector} not found. Consulting AI Agent for suggestions...`);
      const suggestion = await aiAgent.suggestFix(this.page, 'Next button');
      if (suggestion) {
        console.warn(`🤖 [AI Agent] POTENTIAL FIX DISCOVERED: ${suggestion}`);
        console.warn(`🔔 [Manual Approval Required] Please update the selector in FormPage.js to use: ${suggestion}`);
      } else {
        console.warn(`❌ [AI Agent] No suggestion available for this failure.`);
      }
      throw new Error(`Navigation button ${selector} missing. AI Agent suggestion provided in logs.`);
    }
  }

  async syncHiddenDebtFields() {
    try {
      let cleanDebtVal = this.selectedSliderAmount.toString().toLowerCase().replace(/,/g, '').trim();
      let numericDebt = 0;

      if (this.brandId === 'senior-tax-defence-main' || this.brandId === 'senior-tax-defense-x') {
        const match = cleanDebtVal.match(/\d+/);
        if (match) {
          const firstVal = parseInt(match[0]);
          if (firstVal < 5000) {
            numericDebt = 5000;
          } else if (firstVal < 10000) {
            numericDebt = 7500;
          } else if (firstVal < 20000) {
            numericDebt = 10000;
          } else if (firstVal < 30000) {
            numericDebt = 20000;
          } else if (firstVal < 100000) {
            numericDebt = 50000;
          } else {
            numericDebt = 100000;
          }
        }
      } else if (this.brandId === 'ptr-main' || this.brandId === 'aftr-main' || this.brandId === 'capital-tax-relief-x' || this.brandId === 'empire-tax-relief-x') {
        const match = cleanDebtVal.match(/\d+/);
        if (match) {
          const firstVal = parseInt(match[0]);
          if (firstVal < 5000) {
            numericDebt = 5000;
          } else if (firstVal < 10000) {
            numericDebt = 7500;
          } else if (firstVal < 20000) {
            numericDebt = 10000;
          } else if (firstVal < 50000) {
            numericDebt = 20000;
          } else if (firstVal < 100000) {
            numericDebt = 50000;
          } else {
            numericDebt = 100000;
          }
        }
      } else if (this.brandId === 'fth-questionnaire') {
        const match = cleanDebtVal.match(/\d+/);
        if (match) {
          const firstVal = parseInt(match[0]);
          if (cleanDebtVal.includes('less than') || cleanDebtVal.includes('under') || cleanDebtVal.includes('<')) {
            numericDebt = 4000;
          } else if (cleanDebtVal.includes('more') || cleanDebtVal.includes('above') || cleanDebtVal.includes('>')) {
            numericDebt = 50000;
          } else {
            if (firstVal < 5000) {
              numericDebt = 4000;
            } else if (firstVal < 7500) {
              numericDebt = 5000;
            } else if (firstVal < 10000) {
              numericDebt = 7500;
            } else if (firstVal < 20000) {
              numericDebt = 10000;
            } else if (firstVal < 50000) {
              numericDebt = 20000;
            } else {
              numericDebt = 50000;
            }
          }
        }
      } else if (this.isTraLink) {
        const match = cleanDebtVal.match(/\d+/);
        if (match) {
          const firstVal = parseInt(match[0]);
          numericDebt = firstVal >= 5000 ? firstVal : 5000;
        } else {
          numericDebt = 5000;
        }
      } else if (cleanDebtVal.includes('less than') || cleanDebtVal.includes('under') || cleanDebtVal.includes('9999') || cleanDebtVal.includes('9,999') || cleanDebtVal.includes('0-9999') || cleanDebtVal.includes('0 - 9999')) {
        numericDebt = 5000;
      } else if ((cleanDebtVal.includes('10') && cleanDebtVal.includes('19')) && !cleanDebtVal.match(/^1000$/)) {
        numericDebt = 10000;
      } else if ((cleanDebtVal.includes('20') && cleanDebtVal.includes('49')) && !cleanDebtVal.match(/^2000$/)) {
        numericDebt = 50000;
      } else if (cleanDebtVal.includes('50') && (cleanDebtVal.includes('99') || cleanDebtVal.includes('more') || cleanDebtVal.includes('above') || cleanDebtVal.includes('+'))) {
        numericDebt = 100000;
      } else if (cleanDebtVal.includes('100,000') || cleanDebtVal.includes('100k') || cleanDebtVal.includes('million')) {
        numericDebt = 100000;
      } else {
        const match = cleanDebtVal.match(/\d+/);
        if (match) {
          const firstVal = parseInt(match[0]);
          // Match the leadProcessor.js exact floor logic
          if (firstVal < 5000) {
            numericDebt = 5000;
          } else {
            numericDebt = firstVal;
          }
        }
      }

      cleanDebtVal = numericDebt > 0 ? numericDebt.toString() : cleanDebtVal;

      if (cleanDebtVal) {
        console.log(`💾 Syncing hidden debt fields to: ${cleanDebtVal}`);
        await this.page.evaluate((debtVal) => {
          // Update all possible hidden debt field names with the selected slider value
          const debtFieldNames = ['tax_debt', 'debt_amount', 'debt', 'debt_value', 'debt_range', 'slider_value', 'amount', 'debt_range_value'];
          debtFieldNames.forEach(name => {
            const fields = document.querySelectorAll(`input[name="${name}"], input[id="${name}"], select[name="${name}"], select[id="${name}"], input.taxval, input.debt-select`);
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
    } catch (e) {
      console.warn('⚠️ Could not sync hidden debt fields:', e.message);
    }
  }

  async submitForm() {
    console.log('🔘 Submitting form');

    // Bypass if already submitted/on thank you page to prevent timeout delays
    const currentUrl = this.page.url();
    if (currentUrl.includes('/ty') || currentUrl.includes('/thank-you') || currentUrl.includes('/thankyou') || currentUrl.includes('leadid=') || currentUrl.includes('transaction_id=')) {
      console.log('✅ Form already submitted. Bypassing submitForm logic.');
      return;
    }

    try {
      await this.syncHiddenDebtFields();



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

      let submitClicked = false;
      
      for (const btn of submitButtons) {
        if (await btn.isVisible({ timeout: 2000 })) {
          console.log('✅ Submit button found, clicking...');
          await btn.click();
          submitClicked = true;
          
          // Wait for navigation after submit click
          try {
            await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
            console.log('✅ Navigation completed after submit');
          } catch (navErr) {
            console.log('⏳ Waiting for page load after submit...');
            await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          }
          
          // Verify we actually left the form page
          const newUrl = this.page.url();
          if (newUrl.includes('/ty') || newUrl.includes('/thank-you') || newUrl.includes('/thankyou') || newUrl.includes('leadid=') || newUrl.includes('transaction_id=')) {
            console.log('✅ Successfully navigated to Thank You page');
          } else {
            console.log('⚠️ Still on form page after submit click');
          }
          
          break;
        }
      }
      
      if (!submitClicked) {
        // Last resort: AI Agent Self-Healing for Submit (Manual Approval Mode)
        console.warn('⚠️ Standard submit buttons not found, consulting AI Agent...');
        const suggestion = await aiAgent.suggestFix(this.page, 'Submit button');
        if (suggestion) {
          console.warn(`🤖 [AI Agent] POTENTIAL SUBMIT FIX DISCOVERED: ${suggestion}`);
          console.warn(`🔔 [Manual Approval Required] Update FormPage.js submit block with: ${suggestion}`);
        }
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

      // Helper to strictly validate true CAKE Lead IDs (8 chars, letters + numbers)
      const isAlphanumericHex8 = (id) => {
        if (!id) return false;
        const norm = id.trim().toUpperCase();
        return /^[A-Z0-9]{8}$/.test(norm) && /[A-Z]/.test(norm) && /[0-9]/.test(norm);
      };

      // Priority 1: URL Parameters
      const paramKeys = ['transaction_id', 'leadid', 'lead_id', 'ckm_id', 'tid', 'reqid', 'request_id', 'id'];
      let leadId = null;

      // Iterate through keys and find the first one that perfectly matches the Alphanumeric Hex-8 format
      for (const key of paramKeys) {
        const val = params.get(key);
        if (isAlphanumericHex8(val)) {
          leadId = val;
          break;
        }
      }

      // If we didn't find a valid Hex-8 ID in the parameters, fallback to grabbing *any* parameter
      // just in case we need it before doing the DOM Deep-Scan.
      if (!leadId) {
        leadId = params.get('transaction_id') || params.get('leadid') || params.get('lead_id') || params.get('ckm_id') || params.get('tid') || params.get('reqid') || params.get('request_id') || params.get('id');
      }

      // Priority 2: DOM DEEP-SCAN (Hidden inputs, Text patterns, GUIDs, Hex-8)
      // If the extracted parameter is NOT a valid alphanumeric Hex-8 (e.g. it's a numeric reqid), we force the DOM scan.
      if (!isAlphanumericHex8(leadId)) {
        console.log('🔍 [DOM Deep-Scan] URL ID missing or non-standard (e.g. numeric reqid). Searching for Hex-8 or GUID IDs...');
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
    return this.redirectedUrl || this.originalUrl;
  }
}

module.exports = FormPage;