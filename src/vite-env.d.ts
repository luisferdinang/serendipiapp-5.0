/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Extender la interfaz de Window para incluir el service worker
declare interface Window {
  workbox: any;
}

declare const __VERSION__: string;
