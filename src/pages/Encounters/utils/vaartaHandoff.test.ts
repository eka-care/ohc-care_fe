import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  VaartaHandoffParams,
  buildVaartaUrl,
  readVaartaDocUrls,
  stripVaartaReturn,
} from "./vaartaHandoff";

const params: VaartaHandoffParams = {
  encounterId: "enc-123",
  title: "Ravi Kumar · Outpatient",
  attendees: "Ravi Kumar (patient), Dr. Asha Rao",
  languageHint: "en,hi",
  templates: "clinical_notes_template",
  callbackUrl:
    "http://localhost:4000/facility/f1/patient/p1/encounter/enc-123/updates",
  publicKey: '{"kty":"RSA","n":"abc","e":"AQAB","kid":"k1"}',
};

describe("buildVaartaUrl", () => {
  it("opens Vaarta's embed redirect with the handoff params", () => {
    const url = new URL(buildVaartaUrl("https://v.example/", params));
    const q = url.searchParams;
    assert.equal(url.origin + url.pathname, "https://v.example/embed");
    assert.equal(q.get("callback_url"), params.callbackUrl);
    assert.equal(q.get("title"), "Ravi Kumar · Outpatient");
    assert.equal(q.get("attendees"), "Ravi Kumar (patient), Dr. Asha Rao");
    assert.equal(q.get("language_hint"), "en,hi");
    assert.equal(q.get("templates"), "clinical_notes_template");
    assert.equal(q.get("encounter_id"), "enc-123");
    assert.deepEqual(JSON.parse(q.get("public_key")!), {
      kty: "RSA",
      n: "abc",
      e: "AQAB",
      kid: "k1",
    });
  });

  it("never sends the encounter id as Vaarta's session id", () => {
    const url = new URL(buildVaartaUrl("https://v.example/", params));
    assert.equal(url.searchParams.has("session_id"), false);
  });

  it("round-trips titles with reserved and non-Latin characters", () => {
    const title = "राम & श्याम #2 · OPD?";
    const url = new URL(
      buildVaartaUrl("https://v.example/", { ...params, title }),
    );
    assert.equal(url.searchParams.get("title"), title);
  });
});

const VAARTA = "http://localhost:8000";
const returnSearch = (...docUrls: string[]) =>
  "?" +
  new URLSearchParams([
    ["tab", "updates"],
    ...docUrls.map((u) => ["doc_url", u]),
  ]).toString();

describe("readVaartaDocUrls", () => {
  it("reads every doc_url on Vaarta's origin", () => {
    const a = `${VAARTA}/voice/v1/blob/b/a.fhir.jwe`;
    const b = `${VAARTA}/voice/v1/blob/b/b.fhir.jwe`;
    assert.deepEqual(readVaartaDocUrls(returnSearch(a, b), VAARTA), [a, b]);
  });

  it("drops urls on any other origin or that aren't urls", () => {
    assert.deepEqual(
      readVaartaDocUrls(
        returnSearch("https://evil.example/x.jwe", "not a url"),
        VAARTA,
      ),
      [],
    );
  });

  it("returns nothing without doc_url", () => {
    assert.deepEqual(readVaartaDocUrls("?tab=updates", VAARTA), []);
  });
});

describe("stripVaartaReturn", () => {
  it("removes Vaarta's params and keeps the encounter's own", () => {
    const href =
      "http://h/p" +
      returnSearch(`${VAARTA}/x`) +
      "&document_id=d1&session_id=sc-1";
    assert.equal(stripVaartaReturn(href), "http://h/p?tab=updates");
  });
});
