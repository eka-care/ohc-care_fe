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
};
