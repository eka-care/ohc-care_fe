// Mirrors CARE's inactiveEncounterStatus; an app can't import CARE's own modules.
const INACTIVE_STATUSES = [
  "cancelled",
  "entered_in_error",
  "discontinued",
  "completed",
];

// CARE's own labels for its encounter classes.
const CLASS_LABELS: Record<string, string> = {
  amb: "Outpatient",
  imp: "Inpatient",
  emer: "Emergency",
  obsenc: "Observation",
  vr: "Virtual",
  hh: "Home Health",
};

export const isActiveEncounter = (status: string) =>
  !INACTIVE_STATUSES.includes(status);

export const encounterClassLabel = (encounterClass: string) =>
  CLASS_LABELS[encounterClass] ?? encounterClass;
