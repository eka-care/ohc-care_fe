import { isCoded, textOf, toCode } from "@/Utils/fhir-to-care/fhir.js";

const GTS = "http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation";
const TIME_UNITS = ["s", "min", "h", "d", "wk", "mo", "a"];

// Keyed by frequency/period/unit, matching CARE's MEDICATION_REQUEST_TIMING_OPTIONS.
const TIMING_CODES = {
  "1/1/d": ["QD", "Once a day"],
  "2/1/d": ["BID", "Two times a day"],
  "3/1/d": ["TID", "Three times a day"],
  "4/1/d": ["QID", "Four times a day"],
  "1/2/d": ["QOD", "Alternate days"],
  "1/1/h": ["Q1H", "Every 1 hour"],
  "1/2/h": ["Q2H", "Every 2 hours"],
  "1/3/h": ["Q3H", "Every 3 hours"],
  "1/4/h": ["Q4H", "Every 4 hours"],
  "1/6/h": ["Q6H", "Every 6 hours"],
  "1/8/h": ["Q8H", "Every 8 hours"],
  "1/12/h": ["Q12H", "Every 12 hours"],
  "1/1/wk": ["WK", "Weekly"],
  "1/1/mo": ["MO", "Monthly"],
};

const ONCE_A_DAY_WHEN = {
  HS: ["HS", "At bedtime"],
  MORN: ["AM", "Every morning"],
};

const WHEN_TEXT = {
  MORN: "In the morning",
  AFT: "In the afternoon",
  EVE: "In the evening",
  NIGHT: "At night",
  HS: "At bedtime",
  WAKE: "After waking",
  C: "With meals",
  AC: "Before meals",
  PC: "After meals",
  ACM: "Before breakfast",
  PCM: "After breakfast",
  ACD: "Before lunch",
  PCD: "After lunch",
  ACV: "Before dinner",
  PCV: "After dinner",
};

export function toDosageInstruction(dosage, supplyDuration) {
  const additional = (dosage.additionalInstruction ?? []).map(toCode);
  const asNeededFor = toCode(dosage.asNeededFor?.[0]);
  const route = toCode(dosage.route);
  const patientInstruction = [
    ...(dosage.timing?.repeat?.when ?? []).map((w) => WHEN_TEXT[w] ?? w),
    ...additional.filter((c) => !isCoded(c)).map((c) => c.display),
    dosage.patientInstruction,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    ...(dosage.sequence !== undefined && { sequence: dosage.sequence }),
    ...(dosage.text && { text: dosage.text }),
    ...timingOf(dosage.timing, supplyDuration),
    as_needed_boolean: dosage.asNeeded === true || Boolean(dosage.asNeededFor),
    ...(isCoded(asNeededFor) && { as_needed_for: asNeededFor }),
    ...(isCoded(route) && { route }),
    ...doseOf(dosage.doseAndRate?.[0]),
    ...(additional.some(isCoded) && {
      additional_instruction: additional.filter(isCoded),
    }),
    ...(patientInstruction && { patient_instruction: patientInstruction }),
  };
}

function timingOf(timing, supplyDuration) {
  const repeat = timing?.repeat;
  if (!repeat?.frequency || !TIME_UNITS.includes(repeat.periodUnit)) return {};
  const key = `${repeat.frequency}/${repeat.period ?? 1}/${repeat.periodUnit}`;
  const code =
    (key === "1/1/d" && ONCE_A_DAY_WHEN[repeat.when?.[0]]) || TIMING_CODES[key];
  const bounds = boundsOf(repeat, supplyDuration);
  return {
    timing: {
      repeat: {
        frequency: repeat.frequency,
        period: String(repeat.period ?? 1),
        period_unit: repeat.periodUnit,
        ...(bounds && { bounds_duration: bounds }),
      },
      ...(code && { code: { system: GTS, code: code[0], display: code[1] } }),
    },
  };
}

// The SDK writes treatment length to either timing.repeat.duration or dispenseRequest.
function boundsOf(repeat, supplyDuration) {
  if (repeat.duration && TIME_UNITS.includes(repeat.durationUnit)) {
    return { value: String(repeat.duration), unit: repeat.durationUnit };
  }
  const unit = supplyDuration?.code ?? supplyDuration?.unit;
  if (supplyDuration?.value && TIME_UNITS.includes(unit)) {
    return { value: String(supplyDuration.value), unit };
  }
  return undefined;
}

function doseOf(doseAndRate) {
  const qty = doseAndRate?.doseQuantity;
  if (qty?.value === undefined) return {};
  const display = qty.unit ?? qty.code ?? "";
  return {
    dose_and_rate: {
      type: "ordered",
      dose_quantity: {
        value: String(qty.value),
        unit: {
          system: qty.system ?? "",
          code: qty.code ?? "",
          display: display || textOf(doseAndRate.type),
        },
      },
    },
  };
}
