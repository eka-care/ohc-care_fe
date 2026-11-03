// Builds the CARE → Vaarta handoff link and reads Vaarta's return param.
// Kept free of app imports so it can be unit-tested with `tsx --test`.

const RETURN_PARAM = "vaarta_session_id";

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

export function readVaartaReturn(search: string): string | null {
  return new URLSearchParams(search).get(RETURN_PARAM);
}

export function stripVaartaReturn(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(RETURN_PARAM);
  return url.toString();
}
