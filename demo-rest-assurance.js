const restAssurance = require('./utils/rest-assurance');

async function demoRestAssurance() {
    console.log('🚀 --- REST-ASSURANCE SPEED DEMO --- 🚀\n');

    // 1. FAST HEALTH CHECK
    const isHealthy = await restAssurance.checkApiHealth();
    
    if (!isHealthy) {
        console.log('🛑 Testing stopped: API is unreachable.');
        return;
    }

    // 2. BULK VERIFICATION (Simulating 5 campaign checks)
    const testLeads = ['A6428B77', 'E78E4D29', 'F088F3D1']; // Using Lead IDs from recent runs
    console.log(`\n📦 Starting Bulk Backend Verification for ${testLeads.length} leads...`);
    
    const startTime = Date.now();
    
    for (const id of testLeads) {
        const result = await restAssurance.verifyLead(id);
        if (result.success) {
            console.log(`✅ [${id}] Backend Recorded Debt: $${result.backendData.recordedDebt} | Pixel: ${result.backendData.pixelFired}`);
        } else {
            console.log(`⚠️  [${id}] Backend Error: ${result.error}`);
        }
    }

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Total Time for ${testLeads.length} Campaign Verifications: ${duration}ms`);
    console.log(`📈 Average Speed: ${(duration / testLeads.length).toFixed(0)}ms per campaign`);
}

demoRestAssurance();
