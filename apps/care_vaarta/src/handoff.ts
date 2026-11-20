// Builds the redirect to the scribe and reads what it appends on publish.
const DOC_URL_PARAM = "doc_url";
const SESSION_ID_PARAM = "session_id";
const ERROR_PARAM = "error";
const ERROR_DESCRIPTION_PARAM = "error_description";
const RETURN_PARAMS = [
  DOC_URL_PARAM,
  "document_id",
  SESSION_ID_PARAM,
  ERROR_PARAM,
  ERROR_DESCRIPTION_PARAM,
];

export interface HandoffParams {
  encounterId: string;
  hfrId: string;
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
    hfr_id: p.hfrId,
    public_key: p.publicKey,
  }).toString();
  return url.toString();
}

export interface ScribeReturn {
  docUrls: string[];
  sessionId: string;
}

export interface ScribeError {
  code: string;
  description: string;
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

// The scribe refuses a handoff by sending the tab back with error instead of doc_url.
export function readError(search: string): ScribeError | undefined {
  const params = new URLSearchParams(search);
  const code = params.get(ERROR_PARAM);
  if (!code) return undefined;
  return { code, description: params.get(ERROR_DESCRIPTION_PARAM) ?? "" };
}

// A reload of the return page carries none of these; a fresh callback carries at least one.
export function hasReturnParams(search: string): boolean {
  const params = new URLSearchParams(search);
  return RETURN_PARAMS.some((param) => params.has(param));
}

export function stripReturnParams(href: string): string {
  const url = new URL(href);
  RETURN_PARAMS.forEach((param) => url.searchParams.delete(param));
  return url.toString();
}
