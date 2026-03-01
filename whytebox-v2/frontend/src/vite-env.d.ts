/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_ENABLE_3D_VISUALIZATION: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_DEBUG_MODE: string;
  readonly VITE_BABYLON_ANTIALIAS: string;
  readonly VITE_BABYLON_ADAPTIVE_DEVICE_RATIO: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Made with Bob
