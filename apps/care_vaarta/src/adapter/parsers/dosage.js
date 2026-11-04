import { isCoded, toCode } from "../fhir.js";

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

// CARE's Rx pad offers only these dose units (DOSAGE_UNITS_CODES); its API rejects any other.
const UCUM = "http://unitsofmeasure.org";
const CARE_DOSE_UNITS = {
  "{tbl}": "tablets",
  g: "gram",
  mg: "milligram",
  ug: "microgram",
  mL: "milliliter",
  "[drp]": "drop",
  "[iU]": "international unit",
  "{count}": "count",
};
const DOSE_UNIT_ALIASES = {
  tablet: "{tbl}",
  tablets: "{tbl}",
  tab: "{tbl}",
  tabs: "{tbl}",
  "{tablet}": "{tbl}",
  gram: "g",
  grams: "g",
  gm: "g",
  milligram: "mg",
  milligrams: "mg",
  mcg: "ug",
  microgram: "ug",
  micrograms: "ug",
  ml: "mL",
  milliliter: "mL",
  millilitre: "mL",
  drop: "[drp]",
  drops: "[drp]",
  iu: "[iU]",
  "[iu]": "[iU]",
  unit: "[iU]",
  units: "[iU]",
};

// Coded value-set fields of a CARE dosage; text-only ones go to the patient instruction instead.
const CODED_FIELDS = {
  route: { label: "Route", valueSet: "system-route" },
  site: { label: "Site", valueSet: "system-body-site" },
  method: { label: "Method", valueSet: "system-administration-method" },
  as_needed_for: { label: "When needed", valueSet: "system-as-needed-reason" },
};

export function toDosageInstruction(dosage, supplyDuration) {
  const additional = (dosage.additionalInstruction ?? []).map(toCode);
  const coded = codedFieldsOf(dosage);
  const dose = doseOf(dosage.doseAndRate?.[0]);
  const patientInstruction = [
    ...(dosage.timing?.repeat?.when ?? []).map((w) => WHEN_TEXT[w] ?? w),
    ...additional.filter((c) => !isCoded(c)).map((c) => c.display),
    ...Object.entries(coded)
      .filter(([, code]) => code.display && !isCoded(code))
      .map(([field, code]) => `${CODED_FIELDS[field].label}: ${code.display}`),
    dose.unmatched && `Dose: ${dose.unmatched}`,
    dosage.patientInstruction,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    ...(dosage.sequence !== undefined && { sequence: dosage.sequence }),
    ...(dosage.text && { text: dosage.text }),
    ...timingOf(dosage.timing, supplyDuration),
    as_needed_boolean: dosage.asNeeded === true || Boolean(dosage.asNeededFor),
    ...Object.fromEntries(
      Object.entries(coded).filter(([, code]) => isCoded(code)),
    ),
    ...(dose.value && { dose_and_rate: dose.value }),
    ...(additional.some(isCoded) && {
      additional_instruction: additional.filter(isCoded),
    }),
    ...(patientInstruction && { patient_instruction: patientInstruction }),
  };
}

// Every dosage field the scribe gave that CARE can't take as is, for the doctor to set in the Rx pad.
export function dosageReviewOf(dosage, supplyDuration) {
  const issues = Object.entries(codedFieldsOf(dosage))
    .filter(([, code]) => code.display && !isCoded(code))
    .map(([field, code]) => ({
      field,
      issue: "uncoded",
      text: code.display,
      valueSet: CODED_FIELDS[field].valueSet,
    }));
  const dose = doseOf(dosage.doseAndRate?.[0]);
  if (dose.unmatched) {
    issues.push({
      field: "dose_and_rate",
      issue: "unit_not_in_care",
      text: dose.unmatched,
    });
  }
  if (!dose.value && !dose.unmatched) {
    issues.push({ field: "dose_and_rate", issue: "missing" });
  }
  const instruction = toDosageInstruction(dosage, supplyDuration);
  if (
    !instruction.timing &&
    !instruction.as_needed_boolean &&
    !instruction.text
  ) {
    issues.push({ field: "timing", issue: "missing" });
  }
  if (instruction.timing && !instruction.timing.repeat.bounds_duration) {
    issues.push({ field: "timing.repeat.bounds_duration", issue: "missing" });
  }
  return issues;
}

function codedFieldsOf(dosage) {
  return Object.fromEntries(
    [
      ["route", dosage.route],
      ["site", dosage.site],
      ["method", dosage.method],
      ["as_needed_for", dosage.asNeededFor?.[0]],
    ]
      .filter(([, concept]) => concept)
      .map(([field, concept]) => [field, toCode(concept)]),
  );
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

// CARE takes a dose only in one of its own units; anything else is left for the doctor.
function doseOf(doseAndRate) {
  const qty = doseAndRate?.doseQuantity;
  if (qty?.value !== undefined) {
    const unit = careDoseUnit(qty);
    if (!unit)
      return { unmatched: `${qty.value} ${qty.unit ?? qty.code ?? ""}`.trim() };
    return {
      value: {
        type: "ordered",
        dose_quantity: { value: String(qty.value), unit },
      },
    };
  }
  const range = doseAndRate?.doseRange;
  if (range?.low?.value === undefined || range?.high?.value === undefined)
    return {};
  const low = careDoseUnit(range.low);
  const high = careDoseUnit(range.high);
  if (!low || !high) {
    return {
      unmatched:
        `${range.low.value}-${range.high.value} ${range.high.unit ?? range.high.code ?? ""}`.trim(),
    };
  }
  return {
    value: {
      type: "ordered",
      dose_range: {
        low: { value: String(range.low.value), unit: low },
        high: { value: String(range.high.value), unit: high },
      },
    },
  };
}

function careDoseUnit(quantity) {
  const raw = quantity.code ?? quantity.unit ?? "";
  const code = CARE_DOSE_UNITS[raw]
    ? raw
    : (DOSE_UNIT_ALIASES[raw.toLowerCase()] ??
      DOSE_UNIT_ALIASES[(quantity.unit ?? "").toLowerCase()]);
  return code && { system: UCUM, code, display: CARE_DOSE_UNITS[code] };
}
