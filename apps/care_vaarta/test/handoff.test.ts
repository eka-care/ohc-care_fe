import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildHandoffUrl,
  readDocUrls,
  stripReturnParams,
} from "../src/handoff.ts";

const SCRIBE = "http://localhost:8000";
const params = {
  encounterId: "enc-1",
  title: "Ravi Kumar · Outpatient",
  attendees: "Ravi Kumar (patient), Asha Rao",
  languageHint: "en,hi",
  templates: "tmpl-1",
  callbackUrl:
    "http://localhost:4000/facility/f/patient/p/encounter/enc-1/vaarta/return",
  publicKey: '{"kty":"RSA","n":"abc","e":"AQAB","kid":"k1"}',
};

describe("buildHandoffUrl", () => {
  it("opens the scribe's embed redirect with every handoff param", () => {
    const url = new URL(buildHandoffUrl(`${SCRIBE}/`, params));
    assert.equal(url.origin + url.pathname, `${SCRIBE}/embed`);
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      callback_url: params.callbackUrl,
      title: params.title,
      attendees: params.attendees,
      language_hint: "en,hi",
      templates: "tmpl-1",
      encounter_id: "enc-1",
      public_key: params.publicKey,
    });
  });
});

describe("readDocUrls", () => {
  const search = (...urls: string[]) =>
    "?" + new URLSearchParams(urls.map((u) => ["doc_url", u])).toString();

  it("keeps doc_urls on the scribe's origin", () => {
    const a = `${SCRIBE}/voice/v1/blob/b/a.fhir.jwe`;
    assert.deepEqual(readDocUrls(search(a), SCRIBE), [a]);
  });

  it("drops urls on other origins and values that aren't urls", () => {
    assert.deepEqual(
      readDocUrls(search("https://evil.example/x", "nope"), SCRIBE),
      [],
    );
  });
});

describe("stripReturnParams", () => {
  it("removes the scribe's params and keeps the page's own", () => {
    assert.equal(
      stripReturnParams(
        "http://h/p?tab=1&doc_url=x&document_id=d&session_id=s",
      ),
      "http://h/p?tab=1",
    );
  });
});
