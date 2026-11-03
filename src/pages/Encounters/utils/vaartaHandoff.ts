// Builds the CARE → Vaarta handoff link and reads the note Vaarta sends back.
// Kept free of app imports so it can be unit-tested with `tsx --test`.

const RETURN_PARAM = "vaarta_session_id";
const NOTE_PARAM = "vaarta_note";

export interface VaartaAttendee {
  name: string;
  role: string;
}

export interface VaartaHandoffParams {
  sessionId: string;
  sessionTitle: string;
  attendees: VaartaAttendee[];
  language: string;
  templateId: string;
  callbackUrl: string;
}

export function buildVaartaUrl(
  baseUrl: string,
  p: VaartaHandoffParams,
): string {
  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    session_id: p.sessionId,
    session_title: p.sessionTitle,
    attendees: JSON.stringify(p.attendees),
    language: p.language,
    template_id: p.templateId,
    callback_url: p.callbackUrl,
  }).toString();
  return url.toString();
}

export interface VaartaReturn {
  sessionId: string;
  note: string;
}

// Vaarta's "Send to CARE" puts the note in the URL fragment so it never reaches a server.
export function readVaartaReturn(hash: string): VaartaReturn | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const note = params.get(NOTE_PARAM);
  if (!note?.trim()) return null;
  return { sessionId: params.get(RETURN_PARAM) ?? "", note };
}

export function stripVaartaReturn(href: string): string {
  const url = new URL(href);
  url.hash = "";
  return url.toString();
}
