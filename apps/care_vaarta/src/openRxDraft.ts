import {
  CareMedicationRequest,
  CareValues,
  convertFHIRToCare,
} from "@/adapter";

import { careApi } from "@/api";
import { config } from "@/config";
import { fetchScribeNote } from "@/crypto";
import { deleteKey } from "@/keyStore";
import { adviceOf, hasRxQuestion, toDraftState, toRxRows } from "@/rxPad";
import { Code, Questionnaire } from "@/types";

export class NoMedicinesError extends Error {}
export class RxQuestionnaireMissingError extends Error {}

export interface ScribeRx {
  care: CareValues[];
  meds: CareMedicationRequest[];
  // What the doctor still has to set in CARE's Rx pad, per medicine.
  todo: string[][];
  questionnaire: Questionnaire;
}

// 1. decrypt each note  2. convert it to CARE's values  3. check CARE has the Rx questionnaire
export async function loadScribeRx(
  docUrls: string[],
  encounterId: string,
): Promise<ScribeRx> {
  const notes = await Promise.all(docUrls.map(fetchScribeNote));
  await Promise.all(notes.flatMap((n) => (n.kid ? [deleteKey(n.kid)] : [])));
  const care = notes.map((n) =>
    convertFHIRToCare(n.bundle, { encounter: encounterId }),
  );
  const meds = care.flatMap((c) => c.medication_request);
  if (!meds.length) throw new NoMedicinesError();

  const questionnaire = await careApi
    .questionnaire(config.rxQuestionnaireSlug)
    .catch(() => undefined);
  if (!questionnaire || !hasRxQuestion(questionnaire)) {
    throw new RxQuestionnaireMissingError();
  }
  return { care, meds, todo: todoOf(care), questionnaire };
}

// The doctor's picks: a CARE medicine per scribe medicine, or null to leave it out.
export async function saveRxDraft(
  rx: ScribeRx,
  picks: (Code | null)[],
  ids: { patientId: string; encounterId: string },
) {
  const kept = rx.meds.flatMap((med, i) =>
    picks[i] ? [{ med, pick: picks[i] }] : [],
  );
  const rows = toRxRows(
    kept.map((k) => k.med),
    kept.map((k) => k.pick),
    {
      encounter: ids.encounterId,
      requester: await careApi.currentUser(),
      advice: adviceOf(rx.care),
      now: new Date().toISOString(),
    },
  );
  const draft = await careApi.createDraft({
    patient: ids.patientId,
    encounter: ids.encounterId,
    questionnaire: rx.questionnaire.slug,
    status: "draft",
    response_dump: {
      questionnaireResponses: toDraftState(rx.questionnaire, rows),
    },
  });
  return draft.id;
}

const FIELD_LABELS: Record<string, string> = {
  route: "route",
  site: "site",
  method: "method",
  as_needed_for: "when needed",
  dose_and_rate: "dose",
  timing: "frequency",
  "timing.repeat.bounds_duration": "duration",
};

function todoOf(care: CareValues[]): string[][] {
  return care.flatMap((c) =>
    c.medication_request.map((_, index) =>
      c.review
        .filter((r) => r.type === "medication_request" && r.index === index)
        .filter((r) => r.field.startsWith("dosage_instruction."))
        .map((r) => {
          const field = r.field.replace(/^dosage_instruction\.\d+\./, "");
          const label = FIELD_LABELS[field] ?? field;
          return r.text ? `${label} (“${r.text}”)` : label;
        }),
    ),
  );
}
