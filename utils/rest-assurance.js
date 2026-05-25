const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config();

/**
 * REST-ASSURANCE: Backend Validation Layer
 * Focused on high-speed lead verification and API health monitoring.
 */
class RestAssurance {
    constructor() {
        this.parser = new xml2js.Parser({ explicitArray: false });
        this.baseUrl = process.env.FIRST_API_BASE_URL;
        this.apiKey = process.env.FIRST_API_KEY;
        this.verticalId = process.env.VERTICAL_ID;
    }

    /**
     * HEALTH CHECK: Pings the tracking API to ensure services are UP.
     * @returns {Promise<boolean>}
     */
    async checkApiHealth() {
        console.log('🛡️  [Rest-Assurance] Starting API Health Check...');
        const startTime = Date.now();
        try {
            const response = await axios.get(this.baseUrl, {
                params: { api_key: this.apiKey, lead_id: '0', vertical_id: this.verticalId },
                timeout: 5000
            });
            const duration = Date.now() - startTime;
            console.log(`✅ [Rest-Assurance] API is ONLINE (${duration}ms)`);
            return true;
        } catch (error) {
            console.error('❌ [Rest-Assurance] API HEALTH CHECK FAILED:', error.message);
            return false;
        }
    }

    /**
     * VERIFY LEAD: Fetches ground-truth data directly from the tracking database.
     * @param {string} leadId 
     * @returns {Promise<object>}
     */
    async verifyLead(leadId) {
        if (!leadId || leadId === 'N/A') return { success: false, error: 'Invalid Lead ID' };

        console.log(`📡 [Rest-Assurance] Verifying Lead ID: ${leadId} via Backend...`);
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: this.apiKey,
                    lead_id: leadId,
                    vertical_id: this.verticalId
                }
            });

            const xmlResult = await this.parser.parseStringPromise(response.data);
            const data = xmlResult?.lead_info_response;

            if (data && data.success === 'true') {
                const traffic = data.traffic_info || {};
                const vertical = data.all_vertical_data?.data || {};
                
                return {
                    success: true,
                    backendData: {
                        recordedDebt: vertical.tax_debt || vertical.income || 'N/A',
                        pixelFired: traffic.pixel_fired === 'true',
                        affiliateId: traffic.affiliate?.affiliate_id?._ || 'N/A',
                        campaignName: traffic.campaign?.campaign_name?._ || 'N/A'
                    }
                };
            }
            return { success: false, error: 'Lead not found in Backend' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new RestAssurance();
