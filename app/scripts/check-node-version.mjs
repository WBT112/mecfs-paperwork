/* global process, console */

/**
 * Checks if the current Node.js version meets the minimum requirement.
 * This is used to ensure all developers and CI environments use the expected
 * Node.js version (Node 24+) as defined in .nvmrc.
 */
export function checkNodeVersion() {
  const MIN_MAJOR = 24;
  const currentMajor = parseInt(process.versions.node.split('.')[0], 10);

  if (currentMajor < MIN_MAJOR) {
    if (process.env.BYPASS_NODE_VERSION_CHECK === 'true') {
      console.warn(
        `\x1b[33m⚠️  Warning: Node.js version ${process.version} is below the required ${MIN_MAJOR}.x. ` +
          `Continuing because BYPASS_NODE_VERSION_CHECK is set.\x1b[0m`,
      );
      return;
    }

    console.error(
      `\x1b[31m❌ Error: Node.js version ${MIN_MAJOR}.x or higher is required.\x1b[0m\n` +
        `Current version: ${process.version}\n\n` +
        `Please upgrade Node.js or use a version manager like nvm:\n` +
        `  nvm install ${MIN_MAJOR}\n` +
        `  nvm use ${MIN_MAJOR}\n\n` +
        `To bypass this check (not recommended), set BYPASS_NODE_VERSION_CHECK=true.`,
    );
    process.exit(1);
  }
}

// If this script is executed directly (e.g., node scripts/check-node-version.mjs)
import { fileURLToPath } from 'node:url';
import path from 'node:path';
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkNodeVersion();
}
