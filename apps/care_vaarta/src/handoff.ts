// Builds the redirect to the scribe and reads the doc_urls it appends on publish.
const DOC_URL_PARAM = "doc_url";
const RETURN_PARAMS = [DOC_URL_PARAM, "document_id", "session_id"];

export interface HandoffParams {
  encounterId: string;
  title: string;
  attendees: string;
  languageHint: string;
  templates: string;
  callbackUrl: string;
  publicKey: string;
}

// encounter_id is not session_id: session_id pins the scribe's own session id.
export function buildHandoffUrl(baseUrl: string, p: HandoffParams): string {
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

// Only urls on the scribe's own origin are fetched, never arbitrary ones from the query string.
export function readDocUrls(search: string, scribeOrigin: string): string[] {
  return new URLSearchParams(search).getAll(DOC_URL_PARAM).filter((raw) => {
    try {
      return new URL(raw).origin === scribeOrigin;
    } catch {
      return false;
    }
  });
}

export function stripReturnParams(href: string): string {
  const url = new URL(href);
  RETURN_PARAMS.forEach((param) => url.searchParams.delete(param));
  return url.toString();
}
