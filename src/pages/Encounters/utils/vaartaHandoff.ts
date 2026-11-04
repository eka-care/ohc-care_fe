// Builds the CARE → Vaarta handoff link and reads the doc_urls Vaarta sends back.
// Kept free of app imports so it can be unit-tested with `tsx --test`.

const DOC_URL_PARAM = "doc_url";
// Vaarta appends these to callback_url on publish.
const RETURN_PARAMS = [DOC_URL_PARAM, "document_id", "session_id"];

export interface VaartaHandoffParams {
  encounterId: string;
  title: string;
  attendees: string;
  languageHint: string;
  templates: string;
  callbackUrl: string;
  publicKey: string;
}

// Vaarta's generic EMR redirect; encounter_id is not session_id, which pins Vaarta's own id.
export function buildVaartaUrl(
  baseUrl: string,
  p: VaartaHandoffParams,
): string {
  const url = new URL("embed", baseUrl);
  url.search = new URLSearchParams({
    callback_url: p.callbackUrl,
    title: p.title,
    attendees: p.attendees,
    language_hint: p.languageHint,
    templates: p.templates,
    encounter_id: p.encounterId,
    public_key: p.publicKey,
  }).toString();
  return url.toString();
}

// Only urls on Vaarta's own origin are fetched, never arbitrary ones from the query string.
export function readVaartaDocUrls(search: string, vaartaOrigin: string) {
  return new URLSearchParams(search).getAll(DOC_URL_PARAM).filter((raw) => {
    try {
      return new URL(raw).origin === vaartaOrigin;
    } catch {
      return false;
    }
  });
}

export function stripVaartaReturn(href: string): string {
  const url = new URL(href);
  RETURN_PARAMS.forEach((param) => url.searchParams.delete(param));
  return url.toString();
}
