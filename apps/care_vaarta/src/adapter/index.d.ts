// Vendored from MedScribeAlliance/fhir2emr-adapters care/js at 772a541; change it there first and copy it back.
import { Code } from "@/types";

export interface CareMedicationRequest {
  status: string;
  intent: string;
  category: string;
  priority: string;
  do_not_perform: boolean;
  medication: Code;
  dosage_instruction: Record<string, unknown>[];
  note?: string;
  encounter?: string;
  dirty: true;
}

export interface CareValues {
  medication_request: CareMedicationRequest[];
  review: {
    type: string;
    index: number;
    field: string;
    issue: "uncoded" | "missing" | "unit_not_in_care";
    text?: string;
    valueSet?: string;
  }[];
  unmapped: { resourceType: string; id?: string; text: string }[];
}

export function convertFHIRToCare(
  bundle: unknown,
  options?: { encounter?: string },
): CareValues;
