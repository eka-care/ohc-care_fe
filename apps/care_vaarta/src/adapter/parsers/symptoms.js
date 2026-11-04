import {
  categoryCodes,
  codeOf,
  notesOf,
  resourcesOf,
  textOf,
  toCode,
} from "../fhir.js";

const SEVERITY_COMPONENT = "246112005";
const FINDING_CONTEXT_COMPONENT = "408729009";
const SEVERITIES = ["mild", "moderate", "severe"];

export function parseSymptoms(bundle, encounter) {
  return resourcesOf(bundle, "Observation")
    .filter((obs) => categoryCodes(obs).includes("symptom"))
    .map((obs) => {
      const severity = componentText(obs, SEVERITY_COMPONENT).toLowerCase();
      const absent =
        componentText(obs, FINDING_CONTEXT_COMPONENT).toLowerCase() ===
        "absent";
      const onset = obs.effectiveDateTime ?? obs.effectivePeriod?.start;
      return {
        code: toCode(obs.code),
        clinical_status: obs.effectivePeriod?.end ? "resolved" : "active",
        verification_status: absent ? "refuted" : "confirmed",
        severity: SEVERITIES.includes(severity) ? severity : "moderate",
        category: "problem_list_item",
        ...(onset && { onset: { onset_datetime: onset } }),
        note: notesOf(obs),
        ...(encounter && { encounter }),
      };
    });
}

function componentText(obs, code) {
  const component = (obs.component ?? []).find((c) => codeOf(c.code) === code);
  return textOf(component?.valueCodeableConcept);
}
