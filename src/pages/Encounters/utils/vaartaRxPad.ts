import { CareValues } from "@/Utils/fhir-to-care";
import { MedicationRequestCreate } from "@/types/emr/medicationRequest/medicationRequest";
import { PrescriptionStatus } from "@/types/emr/prescription/prescription";
import { ResponseValue } from "@/types/questionnaire/form";
import { UserReadMinimal } from "@/types/user/user";

export const RX_PAD_SLUG = "medication_request";

// Same row shape the Rx pad builds when a doctor applies a saved template.
export function toRxPadValues(
  care: CareValues[],
  encounter: string,
  requester: UserReadMinimal,
): ResponseValue[] {
  const authoredOn = new Date().toISOString();
  const medications: MedicationRequestCreate[] = care
    .flatMap((c) => c.medication_request)
    .map((med) => ({
      ...med,
      encounter,
      authored_on: authoredOn,
      requester,
      create_prescription: {
        status: PrescriptionStatus.active,
        alternate_identifier: "",
      },
    }));
  if (!medications.length) return [];
  return [{ type: "medication_request", value: medications }];
}
