import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { encounterClassLabel, isActiveEncounter } from "../src/encounter.ts";

describe("isActiveEncounter", () => {
  it("treats cancelled, entered_in_error, discontinued and completed as inactive", () => {
    for (const status of [
      "cancelled",
      "entered_in_error",
      "discontinued",
      "completed",
    ]) {
      assert.equal(isActiveEncounter(status), false, status);
    }
  });

  it("treats in_progress and planned as active", () => {
    assert.equal(isActiveEncounter("in_progress"), true);
    assert.equal(isActiveEncounter("planned"), true);
  });
});

describe("encounterClassLabel", () => {
  it("uses CARE's label for a known class", () => {
    assert.equal(encounterClassLabel("amb"), "Outpatient");
  });

  it("falls back to the raw class when it has no label", () => {
    assert.equal(encounterClassLabel("xyz"), "xyz");
  });
});
