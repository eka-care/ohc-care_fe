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

const returnHash = (sessionId: string, note: string) =>
  "#" +
  new URLSearchParams({ vaarta_session_id: sessionId, vaarta_note: note });

describe("readVaartaReturn", () => {
  it("reads the session id and note from the fragment", () => {
    assert.deepEqual(readVaartaReturn(returnHash("sc-abc", "# Note")), {
      sessionId: "sc-abc",
      note: "# Note",
    });
  });

  it("round-trips markdown with reserved and non-Latin characters", () => {
    const note = "**Dx:** फ्लू & cough #2 — 50% better?\n- BP 120/80";
    assert.equal(readVaartaReturn(returnHash("sc-1", note))?.note, note);
  });

  it("returns null without a note", () => {
    assert.equal(readVaartaReturn("#vaarta_session_id=sc-abc"), null);
    assert.equal(readVaartaReturn(""), null);
  });

  it("returns null for a blank note", () => {
    assert.equal(readVaartaReturn(returnHash("sc-abc", "   ")), null);
  });
});

describe("stripVaartaReturn", () => {
  it("removes the fragment and keeps the query", () => {
    assert.equal(
      stripVaartaReturn("http://h/p?x=1" + returnHash("sc-abc", "note")),
      "http://h/p?x=1",
    );
  });
});
