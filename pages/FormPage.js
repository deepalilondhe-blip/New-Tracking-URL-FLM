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
      await this.clickNextButton('.next-btn1');

      // ===== STEP: DEBT TYPE (If present) =====
      await this.waitForSpinner();
      const debtTypeLocator = this.page.locator('.next-btn2:has-text("Federal"), button:has-text("Federal")').first();
      if (await debtTypeLocator.isVisible({ timeout: 2000 })) {
        const stepHeader = await this.getVisibleStepHeader();
        const text = await debtTypeLocator.textContent().catch(() => "Federal");
        this.step1 = stepHeader ? `${stepHeader}: ${text.trim()}` : `Debt Type: ${text.trim()}`;
        console.log(`🔘 Step: Selecting Debt Type (${this.step1})`);
        await debtTypeLocator.click();
        await this.page.waitForTimeout(800);
      } else {
        // ===== STEP 2: STATE (Fallback if Debt Type not there) =====
        console.log('🔘 Step 2: Selecting State');
        try {
          const stateSelect = this.page.locator('#state').first();
          // Select option directly on the underlying select tag via DOM evaluation (supports hidden elements)
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
          const stepHeader = await this.getVisibleStepHeader();
          this.step3 = stepHeader ? `${stepHeader}: ${state}` : `State: ${state}`;
          console.log(`✅ Selected State: ${this.step3}`);
        } catch (e) {
          console.warn('⚠️ State selection DOM evaluation failed:', e.message);
        }
        await this.clickNextButton('.next-btn, .next-btn2');
      }

      // ===== STEP: MONTHLY INCOME (If present) =====
      await this.waitForSpinner();
      const incomeLocator = this.page.locator('.next-btn3').first();
      if (await incomeLocator.isVisible({ timeout: 2000 })) {
        const stepHeader = await this.getVisibleStepHeader();
        const text = await incomeLocator.textContent().catch(() => "Less than $4,000");
        this.step2 = stepHeader ? `${stepHeader}: ${text.trim()}` : `Monthly Income: ${text.trim()}`;
        console.log(`🔘 Step: Selecting Monthly Income (${this.step2})`);
        await incomeLocator.click();
        await this.page.waitForTimeout(800);
      }

      // ===== STEP: NAME & CONTACT INFO =====
      await this.waitForSpinner();
      console.log('🔘 Filling Contact Info');

      // First Name
      try {
        const fName = this.page.locator('#first_name, input[name="first_name"]').first();
        await fName.waitFor({ state: 'visible', timeout: 5000 });
        await fName.click();
        await fName.fill(firstName);
        await this.page.keyboard.press('Tab');
        console.log(`✅ First Name filled: ${firstName}`);
      } catch (e) {
        console.warn('⚠️ First Name input failed or not found:', e.message);
      }

      // Last Name
      try {
        const lName = this.page.locator('#last_name, input[name="last_name"]').first();
        await lName.waitFor({ state: 'visible', timeout: 4000 });
        await lName.click();
        await lName.fill(lastName);
        await this.page.keyboard.press('Tab');
        console.log(`✅ Last Name filled: ${lastName}`);
      } catch (e) {
        console.warn('⚠️ Last Name input failed or not found:', e.message);
      }

      // Email
      await this.waitForSpinner();
      try {
        const emailField = this.page.locator('#email, #email_address, input[name="email"], input[name="email_address"], input[type="email"], input[placeholder*="Email"]').first();
        await emailField.waitFor({ state: 'visible', timeout: 5000 });
        await emailField.click();
        await emailField.fill(email);
        await this.page.keyboard.press('Tab');
        console.log(`✅ Email filled: ${email}`);
      } catch (e) {
        console.warn('⚠️ Email input failed or not found:', e.message);
      }

      await this.clickNextButton('.next-btn3, .next-btn4');

      // Phone
      await this.waitForSpinner();
      try {
        const phoneField = this.page.locator('#primary_phone, #phone, #phone_home, input[name="phone"], input[name="phone_home"], input[name="primary_phone"], input[type="tel"]').first();
        await phoneField.waitFor({ state: 'visible', timeout: 5000 });
        await phoneField.click();
        await phoneField.fill(phone);
        await this.page.keyboard.press('Tab');
        console.log(`✅ Phone filled: ${phone}`);
      } catch (e) {
        console.warn('⚠️ Phone input failed or not found:', e.message);
      }

      await this.clickNextButton('.next-btn4, .next-btn5');

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
        const genericNext = this.page.locator('button:has-text("NEXT"), button:has-text("Next"), a:has-text("NEXT"), a:has-text("Next"), div:has-text("NEXT"), div:has-text("Next"), .next-btn, .next-btn1, .next-btn2, .next-btn3, .next-btn4, .next-btn5').first();
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