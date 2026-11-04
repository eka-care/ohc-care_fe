import { CareValues } from "@/Utils/fhir-to-care";
import query from "@/Utils/request/query";
import { Code } from "@/types/base/code/code";
import { MedicationRequestCreate } from "@/types/emr/medicationRequest/medicationRequest";
import { PrescriptionStatus } from "@/types/emr/prescription/prescription";
import { ResponseValue } from "@/types/questionnaire/form";
import { UserReadMinimal } from "@/types/user/user";
import valueSetApi from "@/types/valueSet/valueSetApi";

export const RX_PAD_SLUG = "medication_request";

// CarePlan is how scribe2fhir carries the doctor's advice to the patient.
const ADVICE_RESOURCE = "CarePlan";

export interface RxPadPrefill {
  values: ResponseValue[];
  matched: number;
  unmatched: number;
}

// Same row shape the Rx pad builds when a doctor applies a saved template.
export async function toRxPadValues(
  care: CareValues[],
  encounter: string,
  requester: UserReadMinimal,
): Promise<RxPadPrefill> {
  const authoredOn = new Date().toISOString();
  const advice = care
    .flatMap((c) => c.unmapped)
    .filter((r) => r.resourceType === ADVICE_RESOURCE && r.text)
    .map((r) => r.text)
    .join("\n");
  const meds = care.flatMap((c) => c.medication_request);
  const codes = await Promise.all(
    meds.map((med) => matchMedication(med.medication)),
  );

  const medications: MedicationRequestCreate[] = meds.map((med, i) => ({
    ...med,
    medication: codes[i] ?? med.medication,
    note: codes[i]
      ? withVaartaName(med.note, med.medication.display)
      : med.note,
    encounter,
    authored_on: authoredOn,
    requester,
    create_prescription: {
      status: PrescriptionStatus.active,
      alternate_identifier: "",
      ...(advice && { note: advice }),
    },
  }));
  const uncoded = meds.filter((med) => !med.medication.code);
  const matched = codes.filter(Boolean).length;
  return {
    values: medications.length
      ? [{ type: "medication_request", value: medications }]
      : [],
    matched,
    unmatched: uncoded.length - matched,
  };
}

// Uses the Rx pad's own search, so the top hit is what the doctor would see first when typing the name.
async function matchMedication(medication: Code): Promise<Code | undefined> {
  if (medication.code || !medication.display) return undefined;
  const { results } = await query(valueSetApi.expand, {
    pathParams: { slug: "system-medication" },
    body: { search: `${medication.display} clinical drug`, count: 1 },
    silent: true,
  })({ signal: new AbortController().signal }).catch((error) => {
    console.warn(`match vaarta medication "${medication.display}"`, error);
    return { results: [] };
  });
  const hit = results[0];
  return hit && { system: hit.system, code: hit.code, display: hit.display };
}

function withVaartaName(note: string | undefined, name: string) {
  const said = `Vaarta: ${name}`;
  return note ? `${said}\n${note}` : said;
}
