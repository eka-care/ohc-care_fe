import { categoryCodes, isCoded, textOf } from "./fhir.js";
import { parseAllergies } from "./parsers/allergies.js";
import { parseConditions } from "./parsers/conditions.js";
import {
  parseMedicationRequests,
  parseMedicationStatements,
} from "./parsers/medications.js";
import { parseSymptoms } from "./parsers/symptoms.js";

const CONTEXT_RESOURCES = [
  "Patient",
  "Encounter",
  "Practitioner",
  "Organization",
];
const MAPPED_RESOURCES = [
  "Condition",
  "AllergyIntolerance",
  "MedicationRequest",
  "MedicationStatement",
];

/**
 * Converts a scribe2fhir Bundle into the values CARE's structured questionnaire
 * questions take, keyed by CARE's structured question type.
 */
export function convertFHIRToCare(bundle, { encounter } = {}) {
  if (bundle?.resourceType !== "Bundle") {
    throw new Error('invalid FHIR bundle: expected resourceType "Bundle"');
  }
  const result = {
    symptom: parseSymptoms(bundle, encounter),
    diagnosis: parseConditions(bundle, encounter),
    allergy_intolerance: parseAllergies(bundle, encounter),
    medication_request: parseMedicationRequests(bundle, encounter),
    medication_statement: parseMedicationStatements(bundle, encounter),
  };
  return {
    ...result,
    review: reviewOf(result),
    unmapped: unmappedOf(bundle),
  };
}

// CARE binds these codes to value sets, so text-only entries need a doctor to pick a code.
function reviewOf(result) {
  return Object.entries(result).flatMap(([type, items]) =>
    items.flatMap((item, index) => {
      const field = "medication" in item ? "medication" : "code";
      const issues = [];
      if (!isCoded(item[field])) {
        issues.push({
          type,
          index,
          field,
          issue: "uncoded",
          text: item[field].display,
        });
      }
      (item.dosage_instruction ?? []).forEach((d, i) => {
        if (d.timing && !d.timing.repeat.bounds_duration) {
          issues.push({
            type,
            index,
            field: `dosage_instruction.${i}.timing.repeat.bounds_duration`,
            issue: "missing",
          });
        }
      });
      return issues;
    }),
  );
}

function unmappedOf(bundle) {
  return (bundle.entry ?? [])
    .map((entry) => entry.resource)
    .filter(
      (r) =>
        r &&
        !CONTEXT_RESOURCES.includes(r.resourceType) &&
        !MAPPED_RESOURCES.includes(r.resourceType) &&
        !(
          r.resourceType === "Observation" &&
          categoryCodes(r).includes("symptom")
        ),
    )
    .map((r) => ({
      resourceType: r.resourceType,
      id: r.id,
      text: summaryOf(r),
    }));
}

function summaryOf(resource) {
  return (
    textOf(resource.code?.concept ?? resource.code ?? resource.vaccineCode) ||
    resource.description ||
    textOf(resource.serviceType?.[0]?.concept) ||
    textOf(resource.payload?.[0]?.contentCodeableConcept) ||
    familyHistoryText(resource) ||
    resource.payload?.[0]?.contentString ||
    ""
  );
}

function familyHistoryText(resource) {
  const conditions = (resource.condition ?? []).map((c) => textOf(c.code));
  if (!conditions.length) return "";
  return `${textOf(resource.relationship)}: ${conditions.join(", ")}`;
}
