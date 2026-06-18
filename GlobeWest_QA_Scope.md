# GlobeWest AU Accessibility Remediation (Phase 1) — QA Tester Scope

## 📌 Overview

This document establishes the **QA Tester Scope of Work** for the front-end accessibility remediation of the GlobeWest Australian (AU) store (`globewest.com.au`), built on **Adobe Commerce (Magento 2)**. 

The goal is to achieve **WCAG 2.2 Level AA** compliance. Remediation of the AU site is a critical dependency for Phase 2 (US store expansion) to ensure that the forked codebase starts accessibility-compliant.

---

## 🚀 Quick Reference & Contacts

### Overdose Digital Team
- **Project Sponsor**: Jess Anticaglia | `jessica.a@overdose.digital` | `+61 437 001 235`
- **Project Manager**: Michelle Munro | `michelle@overdose.digital`
- **Technical Lead**: Alex Pape | `alex@overdose.digital`
- **Design Lead**: Shantelle Johnson | `shantelle@overdose.digital`
- *Note: Copy `jessica.a@overdose.digital` on all communication.*

### Delivery Partner (MagnetoIT)
- **QA Lead / Technical Lead**: TBC
- **Staging URL**: `mcstaging2.globewest.com`

---

## 📊 QA Execution Flow

```
1. Setup & Requirements Analysis
   ├─ Access Staging environment (mcstaging2.globewest.com)
   ├─ Review the WCAG 2.2 Level AA Audit Report (supplied by OD)
   └─ Configure testing tools (Lighthouse, NVDA, VoiceOver)

2. Step-by-Step Template Audits
   ├─ Run Automated Scans (Lighthouse, axe-core, WAVE)
   ├─ Perform Keyboard-Only navigation checks (tab index, focus outlines)
   ├─ Run Screen Reader manual testing (NVDA & VoiceOver speech flow)
   └─ Validate HTML elements (colour contrast, touch targets, carousel DOM)

3. Compatibility Matrix Testing
   ├─ Perform visual verification across 12 layout combinations
   └─ Run functional journey tests across 3 primary combinations

4. Defect Logging & Re-testing
   ├─ Maintain a detailed Remediation & UAT Log
   ├─ Capture failure screenshots/recordings
   └─ Re-test fixes until zero P1/P2 issues remain

5. Post-Fix Verification & Sign-off
   ├─ Verify post-remediation Core Web Vitals
   ├─ Support OD's auditor during verification pass on staging
   └─ Compile final hand-over evidence
```

---

## 🔍 Validation Rules & Success Criteria

QA Testers must verify compliance against the five core pillars:

### 1. Colour Contrast (WCAG 2.2 AA Criteria 1.4.3)
- **✓ Pass Condition**: Text, inputs, promo banners, ETA data spans, body copy, and footer links must achieve:
  - **4.5:1** contrast ratio for normal text.
  - **3.0:1** contrast ratio for large text and UI components.
- **✗ Fail Condition**: Text color fails tool contrast check against its background.

### 2. ARIA & Text Labels (WCAG 2.2 AA Criteria 1.1.1 / 4.1.2)
- **✓ Pass Condition**: Accessible names/labels present on all icon-only buttons/links (social media footer links, product image links, compare buttons, search bar, wishlist).
- **✗ Fail Condition**: Interactive controls lack discernible text for screen readers.

### 3. Touch Target Sizing (WCAG 2.2 AA Criteria 2.5.8)
- **✓ Pass Condition**: All tap targets (buttons, links, carousel arrows, swatches) must be at least **44x44 CSS pixels** in size or spacing.
- **✗ Fail Condition**: Targets under 44px causing accidental adjacent clicks on mobile devices.

### 4. Viewport Settings & Zoom (WCAG 2.2 AA Criteria 1.4.4)
- **✓ Pass Condition**: Mobile viewport configurations must allow browser-level pinch-to-zoom (user-scalable).
- **✗ Fail Condition**: Presence of `user-scalable=no` or scale limits in viewport meta tags.

### 5. Carousel HTML structure (WCAG 2.2 AA Criteria 1.3.1 / 4.1.1)
- **✓ Pass Condition**: Slick or Swiper carousels must have valid semantic structures (lists only contain `li` items directly; slides correctly structured).
- **✗ Fail Condition**: Malformed nested lists (e.g., `ul` containing direct `div` containers).

---

## 📋 Page Templates & Journeys In-Scope

QA verification is required on the following core page types and end-to-end user journeys:
- **Homepage** (Hero banners, promo widgets, main nav header)
- **Product Listing Page (PLP)** (Filters, sorting, grid, pagination)
- **Product Detail Page (PDP)** (Image gallery, swatches, selectors, quantity, tabs, reviews)
- **Search Results Page** (Autocomplete, queries, grids)
- **Checkout Journey** (Minicart, cart forms, billing/shipping fields, payment, order success)
- **My Account Area** (Customer dashboards, address books, order tables)
- **B2B Trade Portal** (Registration forms, pricing grids, trade application)
- **Static Pages** (About, Showrooms, Contact form, FAQs)

---

## 💻 Browser & Device Testing Matrices

### 7.1 UI Testing Matrix (12 Layout Combinations)

| # | Device Category | Operating System | Web Browser |
|---|:---|:---|:---|
| 1 | MacBook Pro / iMac | macOS Ventura | Chrome (latest) |
| 2 | MacBook Pro / iMac | macOS Ventura | Safari (latest) |
| 3 | MacBook Pro / iMac | macOS Sonoma | Chrome (latest) |
| 4 | MacBook Pro / iMac | macOS Sonoma | Safari (latest) |
| 5 | Android Phone (S22) | Android 14 | Chrome (latest) |
| 6 | Android Phone (S23 Ultra) | Android 14 | Samsung Internet (latest) |
| 7 | iPhone 13 mini | iOS 18 | Safari (latest) |
| 8 | iPhone 14 Pro Max | iOS 18 | Safari (latest) |
| 9 | iPad Air (5th gen) | iPadOS 17 | Safari (latest) |
| 10 | Android Tablet (Tab S8) | Android 13 | Chrome (latest) |
| 11 | Windows PC | Windows 11 | Chrome (latest) |
| 12 | Windows PC | Windows 11 | Edge (latest) |

### 7.2 Functionality & Journey Testing Matrix (3 Combinations)

Must verify: homepage navigation, PLP browse, PDP view, add to cart, checkout entry, My Account login, and B2B trade portal login.

| # | Device Category | Operating System | Web Browser |
|---|:---|:---|:---|
| 1 | MacBook Pro / iMac | macOS Sonoma | Chrome (latest) |
| 2 | iPhone 14 Pro Max | iOS 18 | Safari (latest) |
| 3 | Samsung Galaxy S23 Ultra | Android 14 | Chrome (latest) |

*Note: Accessibility journey testing must be verified using **NVDA on Windows 11 (Chrome/Edge)**, **VoiceOver on macOS (Safari)**, and **VoiceOver on iOS 18 (Safari)**, and documented independently.*

---

## 📦 QA Deliverables Checklist

*   [ ] **Remediation Log**: A spreadsheet mapping each audit finding to the applied fix.
*   [ ] **Test Matrix Run Sheets**: Signed-off UI and functionality run sheets.
*   [ ] **Screen Reader Test Recordings**: Video/audio files proving NVDA and VoiceOver manual runs.
*   [ ] **Automated Scan Reports**: Clean Lighthouse and axe-core scan reports per page template.
*   [ ] **Zero Open P1/P2 Defects**: Log proving no Critical (P1) or Major (P2) bugs remain at sign-off.
*   [ ] **Performance Benchmarks**: Post-fix Lighthouse score logs confirming:
    - **LCP** < 2.5s
    - **CLS** < 0.1
    - **INP** < 200ms

---

## ⚠️ Scope Boundaries

### ✅ In-Scope (QA Responsibilities)
- Verification of accessibility remediations on staging (`mcstaging2.globewest.com`).
- Cross-device visual and functional testing.
- Manual screen reader and keyboard verification.
- Post-remediation performance checks.

### ❌ Out-of-Scope (Excluded)
- Auditing new brand refresh layouts (OD-owned).
- Backend database or ERP integration logic (Celigo/NetSuite).
- Phase 2 US store build configurations.
- Authoring the public-facing accessibility statement.

---

## 🐛 Common QA Troubleshooting

### 1. Element focus outline is not visible
- **Check**: Look for `outline: none` or `outline: 0` in CSS.
- **Remediation**: Apply high-contrast outline on focus:
  `a:focus, button:focus { outline: 3px solid #e0533c !important; outline-offset: 2px; }`

### 2. Tab focus escapes active modal drawer
- **Check**: Test if tabbing highlights elements behind the overlay.
- **Remediation**: Implement JS focus trap behavior to loop focus inside the active container.

### 3. Mobile pinch-to-zoom is locked
- **Check**: Check if viewport meta tag restricts scaling.
- **Remediation**: Ensure viewport config is zoom-enabled:
  `<meta name="viewport" content="width=device-width, initial-scale=1.0">`

### 4. Malformed Carousel lists
- **Check**: Check if list elements contain direct child divs.
- **Remediation**: Restructure list markup so `ul` or `ol` contain only `li` elements.
