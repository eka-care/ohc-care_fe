// Template ids from the scribe workspace (GET /voice/api/v1/template); first is the default.
export const TEMPLATES = [
  { id: "3b6f6d9e-0d7a-4a3c-9c6f-4a1e2f7c8d01", label: "Clinical Notes" },
  { id: "7c2e1a54-9b3d-4e8f-a1c2-5d6e7f8a9b02", label: "SOAP Notes" },
  { id: "e58a4c19-2f7b-4d61-8e3a-9b0c1d2e3f03", label: "Prescription Print" },
];

// Shown in their own script so they're recognisable regardless of UI language.
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "bn", label: "বাংলা (Bengali)" },
];
