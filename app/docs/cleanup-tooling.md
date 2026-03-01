# Cleanup Tooling (Report-Only)

This project includes optional cleanup audits that are intentionally non-blocking for normal feature work.

## Commands

1. `npm run cleanup:css:report`  
   Runs a PurgeCSS-based analysis for `src/index.css` and writes:
   - `reports/unused-css-report.json`

2. `npm run cleanup:knip:report`  
   Runs Knip with JSON reporter and writes:
   - `reports/knip-report.json`

3. `npm run cleanup:dupes:report`  
   Runs jscpd duplicate detection and writes:
   - `reports/jscpd/`

4. `npm run cleanup:report`  
   Executes all cleanup reports in sequence.

## RATIONALE

These reports are designed to support maintainability work without introducing CI instability from framework-generated classes or temporary architectural drift. They provide visibility first; enforcement can be added later if desired.
