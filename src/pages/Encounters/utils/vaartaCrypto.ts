import { compactDecrypt, decodeProtectedHeader } from "jose";

import {
  deleteVaartaKey,
  getVaartaKey,
  putVaartaKey,
} from "@/pages/Encounters/utils/vaartaKeyStore";

export class VaartaKeyMissingError extends Error {}

// A fresh key per handoff; the private half is non-extractable and never leaves this browser.
export async function createVaartaPublicKey(): Promise<string> {
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
  await putVaartaKey(kid, privateKey);
  const { kty, n, e } = await crypto.subtle.exportKey("jwk", publicKey);
  return JSON.stringify({ kty, n, e, kid });
}

export interface VaartaBundle {
  bundle: unknown;
  kid?: string;
}

// Vaarta sends a compact JWE when a public key was in the link, plain FHIR JSON otherwise.
export async function fetchVaartaBundle(docUrl: string): Promise<VaartaBundle> {
  const res = await fetch(docUrl);
  if (!res.ok) throw new Error(`fetch vaarta note: ${res.status}`);
  const body = (await res.text()).trim();
  if (body.startsWith("{")) return { bundle: JSON.parse(body) };

  const { kid } = decodeProtectedHeader(body);
  const key = kid ? await getVaartaKey(kid) : undefined;
  if (!kid || !key) throw new VaartaKeyMissingError("vaarta key not found");
  const { plaintext } = await compactDecrypt(body, key);
  return { bundle: JSON.parse(new TextDecoder().decode(plaintext)), kid };
}

export { deleteVaartaKey };
