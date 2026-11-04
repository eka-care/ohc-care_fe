import {
  categoryCodes,
  codeOf,
  notesOf,
  pick,
  resourcesOf,
  snake,
  textOf,
  toCode,
} from "../fhir.js";

const CLINICAL_STATUSES = [
  "active",
  "recurrence",
  "relapse",
  "inactive",
  "remission",
  "resolved",
];
const VERIFICATION_STATUSES = [
  "unconfirmed",
  "provisional",
  "differential",
  "confirmed",
  "refuted",
  "entered_in_error",
];
const SEVERITIES = ["mild", "moderate", "severe"];

// problem-list-item is the SDK's medical history; CARE files it as a chronic condition.
export function parseConditions(bundle, encounter) {
  return resourcesOf(bundle, "Condition").map((condition) => {
    const severity = textOf(condition.severity).toLowerCase();
    return {
      code: toCode(condition.code),
      clinical_status: pick(
        codeOf(condition.clinicalStatus),
        CLINICAL_STATUSES,
        "active",
      ),
      verification_status: pick(
        snake(codeOf(condition.verificationStatus)),
        VERIFICATION_STATUSES,
        "confirmed",
      ),
      severity: SEVERITIES.includes(severity) ? severity : null,
      category: categoryCodes(condition).includes("problem-list-item")
        ? "chronic_condition"
        : "encounter_diagnosis",
      ...onsetOf(condition),
      note: notesOf(condition),
      ...(encounter && { encounter }),
      dirty: true,
    };
  });
}

function onsetOf(condition) {
  const onsetDatetime = condition.onsetDateTime ?? condition.onsetPeriod?.start;
  if (onsetDatetime) return { onset: { onset_datetime: onsetDatetime } };
  if (condition.onsetString) {
    return { onset: { onset_string: condition.onsetString } };
  }
  return {};
}
