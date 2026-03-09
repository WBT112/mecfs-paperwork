## 2026-03-09 - Hardening supply chain with package overrides

**Learning:** When direct dependencies (like `ajv`) have version conflicts with `overrides`, it's safer to target the specific sub-dependencies that are vulnerable (like `serialize-javascript` and `minimatch` in build tools) to avoid breaking the main application logic or development tools. High-severity RCE vulnerabilities in build-time tools (like `serialize-javascript`) can be mitigated by forcing a newer version via `overrides` if the project uses a compatible Node.js version.

**Action:** Use `npm audit` to identify transitive vulnerabilities and apply targeted `overrides` in `package.json`. Always verify that `npm install` completes without EOVERRIDE errors and run full quality gates to ensure no regressions in build or test workflows.
