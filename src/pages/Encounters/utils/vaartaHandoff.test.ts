import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  VaartaHandoffParams,
  buildVaartaUrl,
  readVaartaReturn,
  stripVaartaReturn,
} from "./vaartaHandoff";

const params: VaartaHandoffParams = {
  sessionId: "enc-123",
  sessionTitle: "Ravi Kumar · Outpatient",
  attendees: [
    { name: "Ravi Kumar", role: "patient" },
    { name: "Dr. Asha Rao", role: "Primary Doctor" },
  ],
  language: "hi",
  templateId: "clinical_notes_template",
  callbackUrl:
    "http://localhost:4000/facility/f1/patient/p1/encounter/enc-123/updates",
};

describe("buildVaartaUrl", () => {
  it("puts all six handoff params on the URL", () => {
    const url = new URL(buildVaartaUrl("https://v.example/", params));
    const q = url.searchParams;
    assert.equal(url.origin + url.pathname, "https://v.example/");
    assert.equal(q.get("session_id"), "enc-123");
    assert.equal(q.get("session_title"), "Ravi Kumar · Outpatient");
    assert.equal(q.get("language"), "hi");
    assert.equal(q.get("template_id"), "clinical_notes_template");
    assert.equal(q.get("callback_url"), params.callbackUrl);
    assert.deepEqual(JSON.parse(q.get("attendees")!), params.attendees);
  });

  it("round-trips titles with reserved and non-Latin characters", () => {
    const sessionTitle = "राम & श्याम #2 · OPD?";
    const url = new URL(
      buildVaartaUrl("https://v.example/", { ...params, sessionTitle }),
    );
    assert.equal(url.searchParams.get("session_title"), sessionTitle);
  });
});

describe("readVaartaReturn", () => {
  it("returns the vaarta_session_id when present", () => {
    assert.equal(readVaartaReturn("?vaarta_session_id=sc-abc&x=1"), "sc-abc");
  });

  it("returns null when absent", () => {
    assert.equal(readVaartaReturn("?x=1"), null);
  });
});

describe("stripVaartaReturn", () => {
  it("removes only vaarta_session_id", () => {
    assert.equal(
      stripVaartaReturn("http://h/p?vaarta_session_id=sc-abc&x=1"),
      "http://h/p?x=1",
    );
  });

  it("drops the ? when nothing else remains", () => {
    assert.equal(
      stripVaartaReturn("http://h/p?vaarta_session_id=sc-abc"),
      "http://h/p",
    );
  });
});
