import {
  notesOf,
  pick,
  resourcesOf,
  snake,
  textOf,
  toCode,
} from "@/Utils/fhir-to-care/fhir.js";
import { toDosageInstruction } from "./dosage.js";

const REQUEST_STATUSES = [
  "active",
  "on_hold",
  "draft",
  "unknown",
  "ended",
  "completed",
  "cancelled",
  "entered_in_error",
];
const INTENTS = [
  "proposal",
  "plan",
  "order",
  "original_order",
  "reflex_order",
  "filler_order",
  "instance_order",
];
const STATEMENT_STATUSES = [
  "active",
  "on_hold",
  "completed",
  "stopped",
  "unknown",
  "entered_in_error",
  "not_taken",
  "intended",
];

// FHIR's "stopped" request is CARE's "ended".
export function parseMedicationRequests(bundle, encounter) {
  return resourcesOf(bundle, "MedicationRequest").map((req) => {
    const status =
      snake(req.status) === "stopped" ? "ended" : snake(req.status);
    const supply = req.dispenseRequest?.expectedSupplyDuration;
    return {
      status: pick(status, REQUEST_STATUSES, "active"),
      intent: pick(snake(req.intent), INTENTS, "order"),
      do_not_perform: req.doNotPerform === true,
      medication: toCode(req.medication?.concept),
      dosage_instruction: (req.dosageInstruction ?? []).map((d) =>
        toDosageInstruction(d, supply),
      ),
      note: notesOf(req),
      ...(encounter && { encounter }),
      dirty: true,
    };
  });
}

export function parseMedicationStatements(bundle, encounter) {
  return resourcesOf(bundle, "MedicationStatement").map((stmt) => {
    const start = stmt.effectivePeriod?.start ?? stmt.effectiveDateTime;
    const end = stmt.effectivePeriod?.end;
    return {
      status: pick(snake(stmt.status), STATEMENT_STATUSES, "active"),
      medication: toCode(stmt.medication?.concept),
      dosage_text: (stmt.dosage ?? [])
        .map((d) => d.text)
        .filter(Boolean)
        .join("; "),
      ...((start || end) && {
        effective_period: { ...(start && { start }), ...(end && { end }) },
      }),
      ...(stmt.reason?.[0] && { reason: textOf(stmt.reason[0].concept) }),
      information_source: "patient",
      note: notesOf(stmt),
      ...(encounter && { encounter }),
    };
  });
}
