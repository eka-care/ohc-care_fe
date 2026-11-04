// Vendored from shyamvlmna/fhir2emr-adapters care/js at cc4860e with @/ imports; change it there first.
import { Code } from "@/types/base/code/code";
import { AllergyIntoleranceRequest } from "@/types/emr/allergyIntolerance/allergyIntolerance";
import { DiagnosisRequest } from "@/types/emr/diagnosis/diagnosis";
import { MedicationRequestTemplateSpec } from "@/types/emr/medicationRequest/medicationRequest";
import { MedicationStatementRequest } from "@/types/emr/medicationStatement";
import { SymptomRequest } from "@/types/emr/symptom/symptom";

export interface CareReviewItem {
  type: string;
  index: number;
  field: string;
  issue: "uncoded" | "missing";
  text?: string;
}

export interface CareUnmappedResource {
  resourceType: string;
  id?: string;
  text: string;
}

export interface CareValues {
  symptom: Omit<SymptomRequest, "encounter">[];
  diagnosis: Omit<DiagnosisRequest, "encounter">[];
  allergy_intolerance: Omit<AllergyIntoleranceRequest, "encounter">[];
  medication_request: (MedicationRequestTemplateSpec & {
    medication: Code;
    dirty: true;
  })[];
  medication_statement: MedicationStatementRequest[];
  review: CareReviewItem[];
  unmapped: CareUnmappedResource[];
}

export function convertFHIRToCare(
  bundle: unknown,
  options?: { encounter?: string },
): CareValues;
