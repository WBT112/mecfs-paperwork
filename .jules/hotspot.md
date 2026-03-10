# Hotspot Journal

## 2026-03-10 - Behavior-based confidence vs. Technical coverage

**Learning:** Reaching 100% line/branch coverage does not always mean all behaviors are validated, especially in modules with complex data mapping and error handling like `src/export/docx.ts`. Internal validation logic (e.g., path traversal checks, version validation) often had "unhappy paths" that were technically covered by generic tests but lacked explicit assertions.

**Action:** When working on a technical 100% covered module, focus on defining "behavioral test cases" that prove specific invariants (e.g., "throws on traversal") rather than just executing lines.
