# care_vaarta

A [CARE](https://github.com/ohcnetwork/care_fe) app that sends an encounter to a MedScribe Alliance scribe (Vaarta) and files the note it publishes as CARE clinical records, through the [care_scribe](https://github.com/eka-care/care_scribe) backend plug. It changes no CARE code: CARE loads it as a plugin.

## What it adds to CARE

- **A Vaarta scribe widget** at the top of the encounter overview (`EncounterOverviewTop` slot), on active encounters. The doctor picks a language and template and starts; the app makes a fresh RSA key pair in the browser and sends the same tab to the scribe's `/embed` redirect with the public key and a `callback_url`. On publish the scribe sends that tab back.
- **`/facility/:facilityId/patient/:patientId/encounter/:encounterId/vaarta/return`**, the `callback_url`. When the doctor publishes, the scribe opens it with a `doc_url` per note. The page:
  1. keeps the `doc_url`s and `session_id` in `sessionStorage`, so a reload or a retry can file them again;
  2. fetches each `doc_url` (only from the scribe's origin) and decrypts it with the private key kept in IndexedDB;
  3. posts each FHIR bundle to care_scribe's `POST /api/care_scribe/encounters/<id>/scribe/fhir/`, which files every section as CARE records;
  4. once every note is filed, deletes the key and goes back to the encounter. On a failure it says why and offers Retry.

## Setup in CARE

1. **Install care_scribe** on the CARE backend, with its FHIR endpoint.
2. **Enable the app.** Build it (below) and host `dist/`. Then either add it as a plug config in CARE's admin, or set `REACT_ENABLED_APPS=eka-care/care_vaarta@<host>/assets/remoteEntry.js` in CARE's env.
3. **Allow CARE in the scribe.** Add CARE's origin to the scribe's `PARTNER_CALLBACK_ORIGINS`.

## Config

Copy `.env.example` to `.env` before building.

| Var | Default | Meaning |
|---|---|---|
| `VITE_VAARTA_URL` | `http://localhost:8000/` | The scribe web app. `doc_url` is only accepted from its origin. |

Template ids in [`src/scribeOptions.ts`](./src/scribeOptions.ts) must exist in the doctor's scribe workspace.

## Develop

```bash
npm install
npm test
npm run typecheck
npm start          # rebuilds on change and serves dist/ on :5180
```

Point a local CARE at it with `REACT_ENABLED_APPS=eka-care/care_vaarta@localhost:5180/assets/remoteEntry.js` in CARE's `.env.local`.
