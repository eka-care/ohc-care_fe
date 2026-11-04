import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildHandoffUrl,
  hasReturnParams,
  readReturn,
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

describe("readReturn", () => {
  const search = (urls: string[], sessionId?: string) =>
    "?" +
    new URLSearchParams([
      ...urls.map((u) => ["doc_url", u]),
      ...(sessionId ? [["session_id", sessionId]] : []),
    ]).toString();

  it("keeps only doc_urls on the scribe's origin", () => {
    const a = `${SCRIBE}/voice/v1/blob/b/a.fhir.jwe`;
    assert.deepEqual(
      readReturn(search([a, "https://evil.example/x", "nope"]), SCRIBE).docUrls,
      [a],
    );
  });

  it("reads session_id", () => {
    assert.equal(readReturn(search([], "s-1"), SCRIBE).sessionId, "s-1");
  });

  it("returns an empty session id when none is sent", () => {
    assert.equal(readReturn(search([]), SCRIBE).sessionId, "");
  });
});

describe("hasReturnParams", () => {
  it("is true when the scribe sent anything back, even a foreign doc_url", () => {
    assert.equal(
      hasReturnParams("?doc_url=https%3A%2F%2Fevil.example%2Fx"),
      true,
    );
    assert.equal(hasReturnParams("?session_id=s-1"), true);
  });

  it("is false for a plain reload of the return page", () => {
    assert.equal(hasReturnParams("?tab=1"), false);
    assert.equal(hasReturnParams(""), false);
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
