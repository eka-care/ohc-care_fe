import {
  codeOf,
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
const CATEGORIES = ["inpatient", "outpatient", "community", "discharge"];
const PRIORITIES = ["routine", "urgent", "asap", "stat"];
// v3-ActCode encounter classes that tell CARE where the medicine is given.
const CATEGORY_BY_ENCOUNTER_CLASS = {
  AMB: "outpatient",
  VR: "outpatient",
  HH: "community",
  IMP: "inpatient",
  ACUTE: "inpatient",
  EMER: "inpatient",
};

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

// FHIR's "stopped" request is CARE's "ended". CARE requires category and priority;
// its own Rx pad defaults them to inpatient and routine.
export function parseMedicationRequests(bundle, encounter) {
  const encounterCategory = encounterCategoryOf(bundle);
  return resourcesOf(bundle, "MedicationRequest").map((req) => {
    const status =
      snake(req.status) === "stopped" ? "ended" : snake(req.status);
    const supply = req.dispenseRequest?.expectedSupplyDuration;
    return {
      status: pick(status, REQUEST_STATUSES, "active"),
      intent: pick(snake(req.intent), INTENTS, "order"),
      category: pick(
        codeOf(req.category?.[0]),
        CATEGORIES,
        encounterCategory ?? "inpatient",
      ),
      priority: pick(req.priority, PRIORITIES, "routine"),
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

function encounterCategoryOf(bundle) {
  const [encounter] = resourcesOf(bundle, "Encounter");
  const classes = [encounter?.class ?? []].flat();
  return classes
    .map((c) => CATEGORY_BY_ENCOUNTER_CLASS[codeOf(c) ?? c.code])
    .find(Boolean);
}
