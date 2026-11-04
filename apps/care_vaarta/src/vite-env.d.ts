/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAARTA_URL?: string;
}

interface Window {
  __CORE_ENV__?: { apiUrl?: string };
}
