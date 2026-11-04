# care_vaarta

A [CARE](https://github.com/ohcnetwork/care_fe) app that sends an encounter to a MedScribe Alliance scribe (Vaarta) and fills CARE's own Rx pad from the FHIR the scribe sends back. It changes no CARE code: CARE loads it as a plugin.

## What it adds to CARE

- **Take Notes On Vaarta**, in the encounter's actions (`EncounterActions` slot). It asks for a language and template, makes a fresh RSA key pair in the browser, and sends the same tab to the scribe's `/embed` redirect with the public key and a `callback_url`. On publish the scribe sends that tab back, so the doctor ends where they began.
- **`/facility/:facilityId/patient/:patientId/encounter/:encounterId/vaarta/return`**, the `callback_url`. When the doctor publishes, the scribe opens it with a `doc_url` per note. The page:
  1. fetches each `doc_url` (only from the scribe's origin) and decrypts it with the private key kept in IndexedDB;
  2. converts the FHIR bundle with the CARE adapter from [fhir2emr-adapters](https://github.com/MedScribeAlliance/fhir2emr-adapters/tree/main/care/js), vendored in `src/adapter/`;
  3. lists the medicines for the doctor. One the scribe sent with a code is ready; for each one without, the doctor clicks it and picks from CARE's own medicine search (`system-medication`), or leaves it out. Nothing is matched automatically. Dosage fields CARE can't take as sent (an uncoded route, a dose unit CARE doesn't offer, a missing duration) are listed for the doctor to set in the Rx pad;
  4. puts the scribe's advice (`CarePlan`) in the prescription note;
  5. saves a CARE questionnaire draft and opens CARE's form on it (`?continue_draft=`), where the doctor reviews and saves.

## Setup in CARE

1. **Import the questionnaire.** In CARE, go to Admin → Questionnaires → Import and upload [`vaarta-rx.questionnaire.json`](./vaarta-rx.questionnaire.json). Give the facility's organisations access to it. Any questionnaire with a `medication_request` question works; set its slug in `VITE_RX_QUESTIONNAIRE_SLUG`.
2. **Enable the app.** Build it (below) and host `dist/`. Then either add it as a plug config in CARE's admin, or set `REACT_ENABLED_APPS=eka-care/care_vaarta@<host>/assets/remoteEntry.js` in CARE's env.
3. **Allow CARE in the scribe.** Add CARE's origin to the scribe's `PARTNER_CALLBACK_ORIGINS`.

## Config

Copy `.env.example` to `.env` before building.

| Var | Default | Meaning |
|---|---|---|
| `VITE_VAARTA_URL` | `http://localhost:8000/` | The scribe web app. `doc_url` is only accepted from its origin. |
| `VITE_RX_QUESTIONNAIRE_SLUG` | `vaarta-rx` | CARE questionnaire whose `medication_request` question the note fills. |

Template ids in [`src/scribeOptions.ts`](./src/scribeOptions.ts) must exist in the doctor's scribe workspace.

## Develop

```bash
npm install
npm test
npm run typecheck
npm start          # rebuilds on change and serves dist/ on :5180
```

Point a local CARE at it with `REACT_ENABLED_APPS=eka-care/care_vaarta@localhost:5180/assets/remoteEntry.js` in CARE's `.env.local`.
