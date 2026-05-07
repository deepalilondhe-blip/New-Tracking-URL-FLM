require('dotenv').config();

class FormPage {
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

  async navigate(url) {
    console.log(`🔗 Navigating to: ${url}`);
    this.originalUrl = url;

    // Clear cookies/session/storage before each run for a clean state
    await this.page.context().clearCookies();
    await this.page.context().clearPermissions();
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded');

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

  async fillForm(data = {}) {
    console.log('📝 Starting multi-step form filling process...');
    const sliderAmount = data.sliderAmount || '20000';
    const state = data.state || 'RI';
    const firstName = data.firstName || 'ckmtestpixel';
    const lastName = data.lastName || 'ckmtestpixel';
    const email = data.email || 'ckmtestpixel@gmail.com';
    const phone = data.phone || '4012473406';

    try {
      // ===== STEP 1: DEBT AMOUNT / SLIDER =====
      await this.waitForSpinner();
      console.log(`🔘 Step 1: Handling Debt Amount (${sliderAmount})`);
      try {
        let selected = false;

        const taxDebtSelect = this.page.locator('select#tax_debt').first();
        if (await taxDebtSelect.isVisible({ timeout: 2000 })) {
          console.log('🔘 Found select#tax_debt dropdown. Selecting option...');
          await taxDebtSelect.evaluate((node, amountVal) => {
            const cleanVal = amountVal.replace(/[$,\s]/g, '').toLowerCase();
            let optionToSelect;
            
            if (cleanVal.includes('0-9999') || cleanVal.includes('09999') || parseInt(cleanVal) < 10000) {
              optionToSelect = Array.from(node.options).find(opt => opt.value === '0-9999' || opt.text.includes('0 - $9,999'));
            } else if (cleanVal.includes('10000-19999') || cleanVal.includes('1000019999') || (parseInt(cleanVal) >= 10000 && parseInt(cleanVal) < 20000)) {
              optionToSelect = Array.from(node.options).find(opt => opt.value === '10000-19999' || opt.text.includes('10,000 - $19,999'));
            } else if (cleanVal.includes('20000-50000') || cleanVal.includes('2000050000') || (parseInt(cleanVal) >= 20000 && parseInt(cleanVal) < 50000)) {
              optionToSelect = Array.from(node.options).find(opt => opt.value === '20000-50000' || opt.text.includes('20,000 - $50,000'));
            } else if (cleanVal.includes('50000') || cleanVal.includes('50000+') || parseInt(cleanVal) >= 50000) {
              optionToSelect = Array.from(node.options).find(opt => opt.value === '50000+' || opt.text.includes('50,000 or more') || opt.text.includes('50,000+'));
            }
            
            if (!optionToSelect) {
              optionToSelect = Array.from(node.options).find(opt => 
                opt.text.toLowerCase().includes(cleanVal) || opt.value.toLowerCase().includes(cleanVal)
              );
            }
            
            if (optionToSelect) {
              node.value = optionToSelect.value;
            } else {
              node.selectedIndex = node.options.length - 1; // Default to last option (50000+)
            }
            
            node.dispatchEvent(new Event('change', { bubbles: true }));
            node.dispatchEvent(new Event('input', { bubbles: true }));
          }, sliderAmount);
          
          console.log(`✅ Selected option from select#tax_debt dropdown for amount: ${sliderAmount}`);
          selected = true;
          await this.page.waitForTimeout(1500);
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
          await this.page.waitForTimeout(1000);
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
              console.log(`✅ Filled debt_amount input with ${amountStr}`);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not select debt amount:', e.message);
      }
      await this.clickNextButton('.next-btn1, .btn-next');

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
          '.custom-btn:visible',
          '.choice-btn:visible',
          '.choice-box:visible',
          '.btn-choice:visible',
          '.form-choice:visible',
          '.debt-option:visible',
          'label.custom-control-label:visible',
          '.option-button:visible',
          'button:not([type="submit"]):not(:has-text("NEXT")):not(:has-text("Next")):visible',
          'a.btn:not(:has-text("NEXT")):not(:has-text("Next")):visible'
        ];

        let clickedChoice = false;
        for (const selector of choiceSelectors) {
          const option = this.page.locator(selector).first();
          if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
            const text = await option.textContent().catch(() => 'Choice');
            const cleanedText = text.trim().replace(/\s+/g, ' ');
            console.log(`🔘 Dynamic Choice found: clicking "${cleanedText}" (${selector})`);
            
            // Record clicked text to step1, step2, step3 columns based on progression
            if (choiceStepCount === 0) {
              this.step1 = cleanedText;
              console.log(`📝 step1 column set to: "${this.step1}"`);
            } else if (choiceStepCount === 1) {
              this.step2 = cleanedText;
              console.log(`📝 step2 column set to: "${this.step2}"`);
            } else if (choiceStepCount === 2) {
              this.step3 = cleanedText;
              console.log(`📝 step3 column set to: "${this.step3}"`);
            }
            choiceStepCount++;

            await option.click({ force: true }).catch(() => {});
            clickedChoice = true;
            await this.page.waitForTimeout(1500);
            break; // Break selector loop to check the step state again
          }
        }

        if (!clickedChoice) {
          // If no custom button is found, check if a generic Next button is visible to skip/advance
          const nextBtn = this.page.locator('.btn-next:visible, .next-btn:visible, button:has-text("NEXT"):visible, button:has-text("Next"):visible').first();
          if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('🔘 No choices found, but NEXT button is visible. Clicking to advance...');
            await nextBtn.click().catch(() => {});
            await this.page.waitForTimeout(1500);
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
          
          // If step3 has not been set yet, populate it with state
          if (choiceStepCount < 3) {
            this.step3 = state;
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
          await nextBtn.click().catch(() => {});
          await this.page.waitForTimeout(1500);
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
          await nextBtn.click({ force: true }).catch(() => {});
          await this.page.waitForTimeout(2000);
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
      console.warn(`⚠️  Button ${selector} not found or clickable:`, e.stack || e.message);
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

      console.log('⏳ Waiting for form submission to complete');
      await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

    } catch (error) {
      console.warn('⚠️  Submit navigation timeout or error, waiting 5s for final URL');
      await this.page.waitForTimeout(5000);
    }
  }

  async getThankYouUrl() {
    console.log('⏳ Waiting for final redirect to Thank You page...');
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      
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
        } catch (e) {}
        await this.page.waitForTimeout(1000); // Wait 1 second before checking again
      }
    } catch (e) {
      console.warn('⚠️ Error during thank you page polling:', e.message);
    }
    const finalUrl = this.page.url();
    console.log('✅ Final Thank You URL:', finalUrl);
    return finalUrl;
  }

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
        console.log('✅ Extracted Lead ID:', leadId);
      } else {
        console.warn('⚠️  No Lead ID found in URL');
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