import { compactDecrypt, decodeProtectedHeader } from "jose";

import { getKey, putKey } from "@/keyStore";

export class KeyMissingError extends Error {}

// A fresh key per handoff; the private half is non-extractable and never leaves this browser.
export async function createPublicKey(): Promise<string> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    false,
    ["encrypt", "decrypt"],
  );
  const kid = crypto.randomUUID();
  await putKey(kid, privateKey);
  const { kty, n, e } = await crypto.subtle.exportKey("jwk", publicKey);
  return JSON.stringify({ kty, n, e, kid });
}

export interface ScribeNote {
  bundle: unknown;
  kid?: string;
}

// A compact JWE when a public key was in the link, plain FHIR JSON otherwise.
export async function fetchScribeNote(docUrl: string): Promise<ScribeNote> {
  const res = await fetch(docUrl);
  if (!res.ok) throw new Error(`fetch scribe note: ${res.status}`);
  const body = (await res.text()).trim();
  if (body.startsWith("{")) return { bundle: JSON.parse(body) };

  const { kid } = decodeProtectedHeader(body);
  const key = kid ? await getKey(kid) : undefined;
  if (!kid || !key) throw new KeyMissingError("scribe key not found");
  const { plaintext } = await compactDecrypt(body, key);
  return { bundle: JSON.parse(new TextDecoder().decode(plaintext)), kid };
}
