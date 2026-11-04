// Builds the redirect to the scribe and reads what it appends on publish.
const DOC_URL_PARAM = "doc_url";
const SESSION_ID_PARAM = "session_id";
const RETURN_PARAMS = [DOC_URL_PARAM, "document_id", SESSION_ID_PARAM];

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

export interface ScribeReturn {
  docUrls: string[];
  sessionId: string;
}

// Only urls on the scribe's own origin are fetched, never arbitrary ones from the query string.
export function readReturn(search: string, scribeOrigin: string): ScribeReturn {
  const params = new URLSearchParams(search);
  const docUrls = params.getAll(DOC_URL_PARAM).filter((raw) => {
    try {
      return new URL(raw).origin === scribeOrigin;
    } catch {
      return false;
    }
  });
  return { docUrls, sessionId: params.get(SESSION_ID_PARAM) ?? "" };
}

export function stripReturnParams(href: string): string {
  const url = new URL(href);
  RETURN_PARAMS.forEach((param) => url.searchParams.delete(param));
  return url.toString();
}
