# Local Scheduler Range Implementation Plan

This document outlines the custom rotational slider and debt range logic implemented inside the Local Scheduler (`leadProcessor.js`) to guarantee maximum data variance and coverage while respecting maximum campaign boundaries.

## 1. Dropdown/Bucket Based Campaigns
Certain campaigns, specifically `FSI-PPC2` and `FTD-PPC2`, use explicit dropdown menus rather than standard continuous numeric sliders. 

**Logic:**
The scheduler automatically rotates through four specific buckets based on the campaign's run index.
- Run Index 0 ➔ `$0 - $9,999` *(Mapped dynamically to `5,000` internally)*
- Run Index 1 ➔ `$10,000 - $19,999` *(Mapped dynamically to `10,000` internally)*
- Run Index 2 ➔ `$20,000 - $50,000` *(Mapped dynamically to `50,000` internally)*
- Run Index 3 ➔ `$50,000 or more` *(Mapped dynamically to `100,000` internally)*

## 2. Standard Slider Campaigns (Continuous Ranges)
For all standard URLs that use the numeric slider, the scheduler utilizes a **6-Tier Rotating Range** algorithm to distribute the generated leads evenly.

**The 6 Ranges & Their Strict Mappings:**
1. `$0 to $7,500` ➔ Tax Debt & Cake Income: **7,500**
2. `$7,500 to $10,000` ➔ Tax Debt & Cake Income: **7,500**
3. `$10,000 to $20,000` ➔ Tax Debt & Cake Income: **10,000**
4. `$20,000 to $50,000` ➔ Tax Debt & Cake Income: **20,000**
5. `$50,000 to $100,000` ➔ Tax Debt & Cake Income: **50,000**
6. `$100,000 to $150,000` ➔ Tax Debt & Cake Income: **100,000 & More**

**Execution Logic:**
- The system determines the current URL index and execution number to select one of the 6 ranges.
- It calculates a pseudo-random, mathematically deterministic value inside that selected range (e.g., $18,000 inside the 3rd range).
- **CRITICAL SAFEGUARD**: The system parses the explicit Maximum Slider Limit provided for that specific URL campaign. If the rotated range exceeds the URL's specific limit, it dynamically caps it so the automation never breaks the UI slider.

## 3. Specific URL Campaign Custom Mappings
Based on explicit requirements, the following campaigns have strict custom ranges and exact mappings for both **Tax Debt** and **Cake Income**. These mappings override the default rotational ranges above.

### A. Fresh Start Initiative - PPC (`fsi-ppc2` / `ftd-ppc2`)
**URL:** `https://fresh-start-initiative.com/ppc2/`
**Implementation Location:** `leadProcessor.js` (Dropdown string parsing logic)
* `$0 - $9,999` ➔ (Mapped to: **5000**)
* `$10,000 - $19,999` ➔ (Mapped to: **10000**)
* `$20,000 - $50,000` ➔ (Mapped to: **20000**)
* `$50,000 or more` ➔ (Mapped to: **50000**)

### B. Veterans Tax Services (`vts-original`)
**URL:** `https://www.veteranstaxservices.com/v5/`
**Implementation Location:** `leadProcessor.js` (URL-specific Max/Min configuration logic)
* **Limits:** Min: 500, Max: 100000
* `$0 - $4,999` ➔ (Mapped to: **5000**)
* `$5,000 - $9,999` ➔ (Mapped to: **7500**)
* `$10,000 - $19,999` ➔ (Mapped to: **10000**)
* `$20,000 - $49,999` ➔ (Mapped to: **20000**)
* `$50,000 - $99,999` ➔ (Mapped to: **50000**)
* `$100,000+` ➔ (Mapped to: **100000**)

### C. Second Chance Tax Relief (X) (`second-chance-tax-relief-x` / `sctr`)
**URL:** `https://www.secondchancetaxrelief.com/dt/`
**Implementation Location:** `leadProcessor.js` (URL-specific Max/Min configuration logic)
* **Limits:** Min: 500, Max: 50000
* `$0 - $4,999` ➔ (Mapped to: **5000**)
* `$5,000 - $9,999` ➔ (Mapped to: **7500**)
* `$10,000 - $19,999` ➔ (Mapped to: **10000**)
* `$20,000 - $49,999` ➔ (Mapped to: **20000**)
* `$50,000+` ➔ (Mapped to: **50000**)

### D. 1800 Fresh Tax (X Afr) (`1803-fresh-tax-afr`)
**URL:** `https://www.1800freshtax.com/lf4/afr/`
**Implementation Location:** `leadProcessor.js` (Dropdown string parsing logic)
* `Less than $9,999` ➔ (Mapped to: **5000**)
* `$10,000 - $19,999` ➔ (Mapped to: **10000**)
* `$20,000 - $49,999` ➔ (Mapped to: **20000**)
* `More than $50,000` ➔ (Mapped to: **50000**)

### E. Fresh Tax Help (Questionnaire) (`fth-questionnaire`)
**URL:** `https://fresh-tax-help.com/questionnaire/`
**Implementation Location:** `leadProcessor.js` (Dropdown string parsing logic)
* `Less than $5,000` ➔ (Mapped to: **5000**)
* `$5,000 - $9,999` ➔ (Mapped to: **7500**)
* `$10,000 - $19,999` ➔ (Mapped to: **10000**)
* `$20,000 - $49,999` ➔ (Mapped to: **20000**)
* `$50,000 or more` ➔ (Mapped to: **50000**)

### F. Senior Tax Campaigns (`senior-tax-defence-main` / `senior-tax-defense-x` / `guardian-tax-relief-ppc`)
**URLs:** `https://flmtrk.com/?a=659&oc=714&c=1892&s1=`, `https://flmtrk.com/?a=659&oc=831&c=2599&s1=`
* `$5,000 - $9,999` ➔ (Mapped to: **7500**)
* `$10,000 - $19,999` ➔ (Mapped to: **10000**)
* `$20,000 - $29,999` ➔ (Mapped to: **20000**)
* `$30,000 - $99,999` ➔ (Mapped to: **50000**)
* `$100,000+` ➔ (Mapped to: **100000**)

### G. Custom 6-Tier Mapping Campaigns
**Campaigns & URLs:**
* **America's First Tax Relief (AFTR)** (`aftr-main`) ➔ `https://mlf-trk.com/?a=659&oc=759&c=2211&s1=`
* **Premier Tax Relief (PTR)** (`ptr-main`) ➔ `https://mlf-trk.com/?a=659&oc=778&c=2251&s1=`
* **Capital Tax Relief (X)** (`capital-tax-relief-x`) ➔ `https://jsttrk.com/?a=659&oc=846&c=2691&s1=`
* **Empire Tax Relief (X)** (`empire-tax-relief-x`) ➔ `https://jsttrk.com/?a=659&oc=844&c=2689&s1=`

**Range Mappings:**
* `$0 - $4,999` ➔ (Mapped to: **5000**)
* `$5,000 - $9,999` ➔ (Mapped to: **7500**)
* `$10,000 - $19,999` ➔ (Mapped to: **10000**)
* `$20,000 - $49,999` ➔ (Mapped to: **20000**)
* `$50,000 - $99,999` ➔ (Mapped to: **50000**)
* `$100,000+` ➔ (Mapped to: **100,000 & More**)

## Implementation Strategy for `leadProcessor.js`
1. **Dropdown Rotation Logic update:** Currently, `FSI-PPC2` rotates into `$50,000 or more` and maps to `100,000`. We will update the logic to explicitly map it to `50000` per the spec above.
2. **Standard Slider Custom Caps:** For `vts` and `sctr`, we will enforce explicit `min` and `max` constraints in the rotational algorithm so they never exceed `$100,000` and `$50,000` respectively. 
3. **Universal Range Mapping overrides:** We will update the `mapToRange()` function and the `cakeIncomeOverride` string-matching conditions to explicitly check the `brandId`. If it matches any of the custom campaigns above, it will use their explicit mapping instead of the generic 4-tier fallback mapping.
4. **Validation and Audit updates:** We will update `validateIncomeMapping()` in `flmAgent.js` to match these custom range boundaries exactly.

## User Review Required
Please review the mappings added above. Once approved, I will implement all of these changes.
