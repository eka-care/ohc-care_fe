export const config = {
  vaartaUrl: import.meta.env.VITE_VAARTA_URL || "http://localhost:8000/",
  rxQuestionnaireSlug:
    import.meta.env.VITE_RX_QUESTIONNAIRE_SLUG || "vaarta-rx",
};
