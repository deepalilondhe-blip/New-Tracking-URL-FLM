require('dotenv').config();

class FormPage {
  constructor(page) {
    this.page = page;
  }

  async navigate(url) {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async fillForm() {
    await this.page.getByLabel(/first name/i).fill(process.env.TEST_FIRST_NAME);
    await this.page.getByLabel(/last name/i).fill(process.env.TEST_LAST_NAME);
    await this.page.getByLabel(/email/i).fill(process.env.TEST_EMAIL);
    
    if (await this.page.getByRole('slider').isVisible()) {
      await this.page.getByRole('slider').fill('10000');
    }
  }

  async submitForm() {
    await this.page.getByRole('button', { name: /submit|continue|get started/i }).click();
    await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
  }

  async getThankYouUrl() {
    return this.page.url();
  }

  extractLeadId(url) {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('leadid') || urlParams.get('lead_id') || null;
  }
}

module.exports = FormPage;