import { CareMedicationRequest, CareValues } from "@/adapter";

import {
  Code,
  Question,
  Questionnaire,
  QuestionnaireFormState,
  UserMinimal,
} from "@/types";

// scribe2fhir carries the doctor's advice to the patient as CarePlan.
const ADVICE_RESOURCE = "CarePlan";
const RX_STRUCTURED_TYPE = "medication_request";

export function adviceOf(care: CareValues[]): string {
  return care
    .flatMap((c) => c.unmapped)
    .filter((r) => r.resourceType === ADVICE_RESOURCE && r.text)
    .map((r) => r.text)
    .join("\n");
}

// The same row CARE's Rx pad builds for a newly added medicine, so its form and API accept it.
// A doctor-chosen code replaces the scribe's, and the scribe's wording is kept in the note.
export function toRxRows(
  meds: CareMedicationRequest[],
  matches: (Code | undefined)[],
  ctx: {
    encounter: string;
    requester: UserMinimal;
    advice: string;
    now: string;
  },
) {
  return meds.map((med, i) => ({
    ...med,
    medication: matches[i] ?? med.medication,
    note:
      matches[i] && matches[i].code !== med.medication.code
        ? scribeNameNote(med.note, med.medication.display)
        : med.note,
    encounter: ctx.encounter,
    authored_on: ctx.now,
    requester: ctx.requester,
    dirty: true,
    create_prescription: {
      status: "active",
      alternate_identifier: "",
      ...(ctx.advice && { note: ctx.advice }),
    },
  }));
}

// Mirrors CARE's initializeResponses: one response per non-group question, rows on the Rx one.
export function toDraftState(
  questionnaire: Questionnaire,
  rows: unknown[],
): QuestionnaireFormState {
  const flat = (qs: Question[]): Question[] =>
    qs.flatMap((q) => (q.type === "group" ? flat(q.questions ?? []) : [q]));
  return {
    questionnaire,
    responses: flat(questionnaire.questions).map((q) => ({
      question_id: q.id,
      link_id: q.link_id,
      structured_type: q.structured_type ?? null,
      values:
        q.structured_type === RX_STRUCTURED_TYPE
          ? [{ type: RX_STRUCTURED_TYPE, value: rows }]
          : [],
    })),
    errors: [],
  };
}

export function hasRxQuestion(questionnaire: Questionnaire): boolean {
  return toDraftState(questionnaire, []).responses.some(
    (r) => r.structured_type === RX_STRUCTURED_TYPE,
  );
}

function scribeNameNote(note: string | undefined, name: string) {
  const said = `Scribe: ${name}`;
  return note ? `${said}\n${note}` : said;
}
