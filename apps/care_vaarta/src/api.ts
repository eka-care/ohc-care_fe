import { Code, Questionnaire, UserMinimal } from "@/types";

export class CareApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${window.__CORE_ENV__?.apiUrl ?? ""}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("care_access_token")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = res.status === 204 ? undefined : await res.json();
  if (!res.ok)
    throw new CareApiError(`${path}: ${res.status}`, res.status, data);
  return data as T;
}

export const careApi = {
  fileScribeFhir: (
    encounterId: string,
    body: { bundle: unknown; session_id: string },
  ) =>
    request<unknown>(
      `/api/care_scribe/encounters/${encounterId}/scribe/fhir/`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  currentUser: () => request<UserMinimal>("/api/v1/users/getcurrentuser/"),

  questionnaire: (slug: string) =>
    request<Questionnaire>(`/api/v1/questionnaire/${slug}/`),

  searchValueSet: (slug: string, search: string, count: number) =>
    request<{ results: Code[] }>(`/api/v1/valueset/${slug}/expand/`, {
      method: "POST",
      body: JSON.stringify({ search, count }),
    }),

  createDraft: (body: {
    patient: string;
    encounter: string;
    questionnaire: string;
    status: "draft";
    response_dump: Record<string, unknown>;
  }) =>
    request<{ id: string }>("/api/v1/form_submission/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
