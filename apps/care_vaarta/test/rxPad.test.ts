import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adviceOf,
  hasRxQuestion,
  toDraftState,
  toRxRows,
} from "../src/rxPad.ts";

const requester = {
  id: "u1",
  username: "doc",
  first_name: "A",
  last_name: "B",
};
const med = (display: string, code = "") => ({
  status: "active",
  intent: "order",
  category: "outpatient",
  priority: "routine",
  do_not_perform: false,
  medication: { system: code ? "http://snomed.info/sct" : "", code, display },
  dosage_instruction: [],
  dirty: true as const,
});
const ctx = {
  encounter: "e1",
  requester,
  advice: "Drink water",
  now: "2026-01-01T00:00:00.000Z",
};

describe("toRxRows", () => {
  it("uses the matched code and keeps the scribe's wording in the note", () => {
    const match = {
      system: "http://snomed.info/sct",
      code: "1",
      display: "Pantoprazole 40 mg",
    };
    const [row] = toRxRows([med("PAN 40")], [match], ctx);
    assert.deepEqual(row.medication, match);
    assert.equal(row.note, "Scribe: PAN 40");
  });

  it("leaves an unmatched medicine as the scribe wrote it", () => {
    const [row] = toRxRows([med("Unknown drug")], [undefined], ctx);
    assert.equal(row.medication.display, "Unknown drug");
    assert.equal(row.note, undefined);
  });

  it("adds no note when the scribe's own code is kept", () => {
    const coded = med("Paracetamol", "387517004");
    const [row] = toRxRows([coded], [coded.medication], ctx);
    assert.equal(row.note, undefined);
  });

  it("fills what CARE's Rx pad sets on a new row", () => {
    const [row] = toRxRows([med("x", "9")], [undefined], ctx);
    assert.equal(row.encounter, "e1");
    assert.equal(row.authored_on, ctx.now);
    assert.deepEqual(row.requester, requester);
    assert.deepEqual(row.create_prescription, {
      status: "active",
      alternate_identifier: "",
      note: "Drink water",
    });
  });
});

describe("adviceOf", () => {
  it("joins the CarePlan advice and ignores other unmapped resources", () => {
    const care = [
      {
        medication_request: [],
        review: [],
        unmapped: [
          { resourceType: "CarePlan", text: "Rest" },
          { resourceType: "Observation", text: "BP" },
          { resourceType: "CarePlan", text: "Water" },
        ],
      },
    ];
    assert.equal(adviceOf(care), "Rest\nWater");
  });
});

describe("toDraftState", () => {
  const questionnaire = {
    id: "q1",
    slug: "vaarta-rx",
    questions: [
      {
        id: "g1",
        link_id: "1",
        type: "group",
        questions: [
          {
            id: "rx",
            link_id: "1.1",
            type: "structured",
            structured_type: "medication_request",
          },
          { id: "n", link_id: "1.2", type: "text" },
        ],
      },
    ],
  };

  it("answers every leaf question and puts the rows on the Rx one", () => {
    const state = toDraftState(questionnaire, [{ x: 1 }]);
    assert.deepEqual(state.responses, [
      {
        question_id: "rx",
        link_id: "1.1",
        structured_type: "medication_request",
        values: [{ type: "medication_request", value: [{ x: 1 }] }],
      },
      { question_id: "n", link_id: "1.2", structured_type: null, values: [] },
    ]);
    assert.equal(state.questionnaire.id, "q1");
  });

  it("tells whether the questionnaire has an Rx question", () => {
    assert.equal(hasRxQuestion(questionnaire), true);
    assert.equal(hasRxQuestion({ ...questionnaire, questions: [] }), false);
  });
});
