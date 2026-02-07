/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
