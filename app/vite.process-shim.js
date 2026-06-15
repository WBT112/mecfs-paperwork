const nextTick = (callback, ...args) => {
  globalThis.queueMicrotask(() => callback(...args));
};

// RATIONALE: Vite 8 no longer injects the process browser shim that the
// docx-templates stream polyfills expect during dependency optimization.
export const process = {
  argv: [],
  browser: true,
  cwd: () => '/',
  env: {},
  nextTick,
  noDeprecation: false,
  pid: 0,
  platform: 'browser',
  stderr: undefined,
  stdout: undefined,
  throwDeprecation: false,
  traceDeprecation: false,
  version: '',
  versions: {},
};
