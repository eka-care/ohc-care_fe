import {
  codeOf,
  notesOf,
  pick,
  resourcesOf,
  snake,
  toCode,
} from "@/Utils/fhir-to-care/fhir.js";

const CLINICAL_STATUSES = ["active", "inactive", "resolved"];
const VERIFICATION_STATUSES = [
  "unconfirmed",
  "confirmed",
  "refuted",
  "presumed",
  "entered_in_error",
];
const CATEGORIES = ["food", "medication", "environment", "biologic"];
const CRITICALITIES = ["low", "high", "unable_to_assess"];

export function parseAllergies(bundle, encounter) {
  return resourcesOf(bundle, "AllergyIntolerance").map((allergy) => ({
    code: toCode(allergy.code),
    clinical_status: pick(
      codeOf(allergy.clinicalStatus),
      CLINICAL_STATUSES,
      "active",
    ),
    verification_status: pick(
      snake(codeOf(allergy.verificationStatus)),
      VERIFICATION_STATUSES,
      "confirmed",
    ),
    category: pick(allergy.category?.[0], CATEGORIES, "medication"),
    criticality: pick(snake(allergy.criticality), CRITICALITIES, "low"),
    ...(allergy.onsetDateTime && { last_occurrence: allergy.onsetDateTime }),
    note: notesOf(allergy),
    ...(encounter && { encounter }),
  }));
}
