# Vaarta scribe widget, filed through care_scribe

## Intent

A doctor on an encounter starts a Vaarta scribe session from the encounter page, and when they publish in Vaarta the whole note lands in CARE as clinical records, with no screen in between. This replaces the current care_vaarta flow, which only carried medicines, made the doctor match each one, and stopped at an Rx pad draft.

## Goals

- A widget at the top of the encounter overview that starts the Vaarta handoff (language, template, start).
- On Vaarta's callback, every note it published is filed against the encounter by the care_scribe backend plug: complaints, diagnoses, history, allergies, current and prescribed medicines, vitals, examination findings, labs, and the rest as the Scribe Note.
- No review or matching screen: the return page files and goes back to the encounter.

## Non-goals

- Editing or reviewing the note in CARE before it is filed. Vaarta's own editor is where the doctor reviews.
- Removing the earlier in-core Vaarta handoff (`src/pages/Encounters/utils/vaarta*`, the Vaarta entry in `EncounterHistorySelector.tsx`, and the `unimported` lint failure on `vaartaHandoff.test.ts`). That is its own PR.
- Changing Vaarta or the medscribe alliance adapter.

## Anti-goals

- A note filed twice because the doctor reloaded the return page or published twice.
- The decryption key or the decrypted note leaving the browser for anywhere but CARE's own backend.
- A half-filed note reported as success.

## Constraints

- Vaarta returns FHIR only: each `doc_url` is a compact JWE (or plain JSON) holding a FHIR Bundle. The private key lives in the browser's IndexedDB, so decryption has to happen in the browser.
- care_scribe today accepts only Vaarta's sectioned note JSON (`sections`, `session_id`, `document_id`, `published_at`).
- care_vaarta is a CARE app loaded through module federation; it changes no CARE core code. CARE's `EncounterOverviewTop` slot renders on the encounter overview with `{ encounter, patientId, encounterId }`.
- On dev, CARE loads the app from a backend plug config row (`REACT_ENABLED_APPS` is empty).

## Approaches

1. **care_scribe reads FHIR (picked).** The browser decrypts and posts the bundle as is; care_scribe gains a FHIR input that maps resources onto the records it already creates, using the scribe's codes when present and its valueset match otherwise. One place holds the mapping and no codes are lost. Cost: backend work in care_scribe.
2. Convert FHIR to the sectioned note in the browser and post to the existing endpoint. No backend change, but codes are flattened to text and re-guessed, and the frontend has to rebuild Vaarta's section format.
3. Extend the medscribe adapter to every resource and file through CARE's own APIs. Most work, in a repo shared with other EMRs, and leaves care_scribe unused.

The user picked 1.

## Design

### Backend: care_scribe FHIR input (eka-care/care_scribe)

- New endpoint, sibling of the existing one: `POST /api/care_scribe/encounters/<encounter_external_id>/scribe/fhir/`.
- Body: `{ "bundle": <FHIR Bundle>, "session_id": "<string>" }`. `session_id` comes from the callback's query string.
- The dedupe key is per note, read from the bundle: `Bundle.identifier.value`, else `Bundle.id` (builder's call, since one callback can carry several `doc_url`s but only one `document_id`). `published_at` is `Bundle.timestamp`, else the time of filing.
- Coded fields use the scribe's codes; an uncoded medicine, route or unit falls back to care_scribe's valueset match and then to text, the same as the sectioned path (builder's call).
- Before building the mapping, take a real bundle from a dev Vaarta publish as the test fixture; category codes for Condition and Observation, and where `symptom` Observations go, are read from it.
- Same auth, permission, and responses as the sectioned endpoint: 201 with ids per resource, 200 when this `document_id` was already filed on this encounter, 400 for a bad body, 403 without encounter questionnaire permission, 409 when the `document_id` is filed under another encounter.
- Resource mapping, to the same CARE records the sectioned path creates: Condition (by category), AllergyIntolerance, MedicationStatement, MedicationRequest, Observation (vitals and exam), ServiceRequest (labs). Anything else, including CarePlan advice and narrative, goes into the one Scribe Note QuestionnaireResponse.
- Filing is all or nothing per note (one transaction).
- A republish from Vaarta (same note, edited) is ignored: the first filing stands and the endpoint answers 200 with the first result. The user decided this.

### Frontend: care_vaarta (apps/care_vaarta)

- `manifest.tsx`: `EncounterActions` is replaced by `EncounterOverviewTop`, loading a `VaartaWidget` component. The callback route stays.
- `VaartaWidget`: a card with the language and template selects inline and a Start button; no dialog. It builds the same handoff URL as today. It renders nothing when the encounter is inactive (cancelled, entered in error, discontinued, completed).
- `VaartaReturnPage`: reads `doc_url` and `session_id`, keeps them in `sessionStorage` and strips them from the address bar, decrypts each note, posts each bundle to the FHIR endpoint, and navigates to the encounter overview with `replace`. The key and the stored `doc_url`s are deleted only once every note is filed (200 or 201). While working it shows one line ("Filing the scribe note…"). On a failure it stays, shows the error for that status, and offers Retry and Back to encounter (builder's call, so a failed post doesn't cost a new Vaarta session).
- Removed: `MedicinePick`, `openRxDraft`, `rxPad`, `useMedicineSearch`, the vendored `adapter/`, `vaarta-rx.questionnaire.json`, `VITE_RX_QUESTIONNAIRE_SLUG`, and their strings and tests. README updated.

## Left to the builder

- Widget layout and copy, matching the overview's other cards.
- Error wording per status.
- How the backend splits FHIR mapping into files, following care_scribe's existing `ingest/` layout.
