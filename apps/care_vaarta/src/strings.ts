export const strings = {
  takeNotes: "Take Notes On Vaarta",
  language: "Language",
  template: "Template",
  start: "Start",
  cancel: "Cancel",
  handoffFailed: "Couldn't start Vaarta. Try again.",
  loading: "Loading the note from Vaarta…",
  noDocUrl: "Vaarta didn't send a note to open.",
  keyMissing:
    "This browser can't open that Vaarta note. Start Take Notes On Vaarta again from this encounter and publish once more.",
  loadFailed:
    "Couldn't load the note from Vaarta. Publish it again from Vaarta.",
  noMedicines: "The note from Vaarta has no prescriptions to add.",
  questionnaireMissing: (slug: string) =>
    `CARE has no questionnaire "${slug}" with a medication request question. Ask an admin to create it (see the care_vaarta README).`,
  backToEncounter: "Back to encounter",
  reviewTitle: "Medicines from Vaarta",
  reviewHint:
    "Choose CARE's medicine for each one Vaarta couldn't code. Everything else opens in CARE's Rx pad.",
  scribeSaid: (name: string) => `Vaarta: ${name}`,
  chooseMedicine: "Choose medicine",
  change: "Change",
  leaveOut: "Leave out",
  searchMedicines: "Search medicines",
  searchFailed: "Couldn't search CARE's medicines. Try again.",
  setInRxPad: (fields: string[]) => `Set in the Rx pad: ${fields.join(", ")}`,
  continueToRxPad: "Continue to Rx pad",
  saving: "Opening the Rx pad…",
  saveFailed: "Couldn't open the Rx pad. Try again.",
};
