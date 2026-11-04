/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAARTA_URL?: string;
  readonly VITE_RX_QUESTIONNAIRE_SLUG?: string;
}

interface Window {
  __CORE_ENV__?: { apiUrl?: string };
}
