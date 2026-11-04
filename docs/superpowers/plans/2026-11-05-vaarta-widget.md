# Vaarta scribe widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace care_vaarta's encounter-actions button and Rx pad flow with an encounter-overview widget, and file every note Vaarta publishes through care_scribe's FHIR endpoint with no screen in between.

**Architecture:** The widget starts the same handoff as today. The return page decrypts each note in the browser and posts the FHIR bundle to `POST /api/care_scribe/encounters/<id>/scribe/fhir/`, keeping the doc_urls in sessionStorage and the keys in IndexedDB until every note is filed. Logic lives in small pure modules tested with `node:test`; components only render.

**Tech Stack:** React 19, TypeScript, Vite module federation, `jose`, `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-04-vaarta-widget-design.md`

## Global Constraints

- All work is in `apps/care_vaarta`; no CARE core file changes.
- Branch `feat/vaarta-widget` off `develop`; one commit per task, lowercase imperative subjects.
- Endpoint: `POST /api/care_scribe/encounters/<encounter_id>/scribe/fhir/`, body `{ "bundle": <FHIR Bundle>, "session_id": "<string>" }`, bearer token from `localStorage.care_access_token`.
- 200 and 201 both mean filed. 400, 403, 409 and anything else are failures.
- The widget renders nothing for encounters whose status is `cancelled`, `entered_in_error`, `discontinued` or `completed`.
- The key and stored doc_urls are deleted only after every note is filed.
- Every check: `npm test` and `npm run typecheck` in `apps/care_vaarta`, then `npm run build`.

## Review Focus

- The doctor reloads the return page after the doc_urls were stripped from the address bar: the stored doc_urls are used and filing runs again (the backend answers 200). Pinned in Task 1.
- A doc_url from any origin but Vaarta's is ignored, as today. Pinned in Task 1.
- Callback with no doc_url and nothing stored: an error, not a spinner. Pinned in Task 1.
- The second of two notes fails: nothing is deleted, the error names the status, and Retry files both again. Pinned in Task 2.
- A 409 (the note was filed under another encounter) is shown as its own message, not as success. Pinned in Task 2.

---

### Task 1: Return params and the pending-return store

**Files:**
- Modify: `src/handoff.ts`
- Create: `src/pendingReturn.ts`
- Test: `test/handoff.test.ts`, `test/pendingReturn.test.ts`

**Interfaces:**
- Produces: `readReturn(search: string, scribeOrigin: string): ScribeReturn` in `src/handoff.ts`, replacing `readDocUrls`, with `interface ScribeReturn { docUrls: string[]; sessionId: string }` (`sessionId` is `""` when absent).
- Produces: in `src/pendingReturn.ts`, `savePendingReturn(storage: Storage, encounterId: string, ret: ScribeReturn): void`, `loadPendingReturn(storage: Storage, encounterId: string): ScribeReturn | undefined`, `clearPendingReturn(storage: Storage, encounterId: string): void`. Key `care_vaarta:return:<encounterId>`, value JSON.

- [ ] **Step 1: Write the failing tests**

In `test/handoff.test.ts`, replace the `readDocUrls` cases with `readReturn` cases: `"keeps only doc_urls on the scribe's origin"` (asserts a foreign-origin and a malformed doc_url are dropped), `"reads session_id"` (asserts `sessionId === "s-1"`), `"returns an empty session id when none is sent"`.

In `test/pendingReturn.test.ts`, with a small in-memory `Storage` fake: `"returns what was saved for that encounter"`, `"returns nothing for another encounter"`, `"returns nothing after clear"`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL, `readReturn` and `../src/pendingReturn.ts` not found.

- [ ] **Step 3: Implement `readReturn` and the three store functions**

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit** `read session_id with the doc_urls and keep them across a reload`

### Task 2: File the notes through care_scribe

**Files:**
- Modify: `src/api.ts`
- Create: `src/fileNotes.ts`
- Test: `test/fileNotes.test.ts`

**Interfaces:**
- Consumes: `fetchScribeNote(docUrl: string): Promise<ScribeNote>` and `KeyMissingError` from `src/crypto.ts`; `deleteKey(kid: string)` from `src/keyStore.ts`.
- Produces: `careApi.fileScribeFhir(encounterId: string, body: { bundle: unknown; session_id: string }): Promise<unknown>` in `src/api.ts`. Remove `currentUser`, `questionnaire`, `searchValueSet`, `createDraft`.
- Produces: in `src/fileNotes.ts`,
  `fileScribeNotes(ret: ScribeReturn, encounterId: string, deps?: FileNotesDeps): Promise<void>`, where `interface FileNotesDeps { fetchNote: typeof fetchScribeNote; post: typeof careApi.fileScribeFhir; deleteKey: (kid: string) => Promise<unknown> }` defaulting to the real ones. Order: fetch and decrypt every note, post each in order, then delete each note's `kid`. Any failure rejects before any key is deleted. A `CareApiError` passes through unchanged.

- [ ] **Step 1: Write the failing tests**

With fake deps: `"posts each bundle with the session id, then deletes each key"` (asserts post calls `[["enc-1", { bundle: b1, session_id: "s-1" }], ["enc-1", { bundle: b2, session_id: "s-1" }]]` and deleteKey calls `["k1", "k2"]`); `"deletes no key when the second post fails"` (second post rejects with `new CareApiError("x", 500, {})`; asserts rejection with status 500 and deleteKey never called); `"rejects with the 409 from the backend"` (asserts `err.status === 409`); `"posts nothing when a note can't be decrypted"` (fetchNote rejects with `KeyMissingError`; asserts post never called).

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL, `../src/fileNotes.ts` not found.

- [ ] **Step 3: Implement `careApi.fileScribeFhir` and `fileScribeNotes`**

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit** `file scribe notes through care_scribe's fhir endpoint`

### Task 3: Return page files and goes back

**Files:**
- Modify: `src/components/VaartaReturnPage.tsx`, `src/strings.ts`

**Interfaces:**
- Consumes: `readReturn`, `savePendingReturn`, `loadPendingReturn`, `clearPendingReturn` (Task 1); `fileScribeNotes`, `CareApiError` (Task 2).

- [ ] **Step 1: Rewrite `VaartaReturnPage`**

On mount, once: `readReturn(window.location.search, vaartaOrigin)`; if it has doc_urls, `savePendingReturn(sessionStorage, …)`, else `loadPendingReturn`. Strip the params with `stripReturnParams`. Nothing to file: show `strings.noDocUrl` with Back to encounter. Otherwise show `strings.filing`, call `fileScribeNotes`, then `clearPendingReturn` and `navigate(\`${encounterPath}/updates\`, { replace: true })`. On failure show `messageFor(err)` with Retry (runs filing again) and Back to encounter.

`messageFor`: `KeyMissingError` gives `keyMissing`; `CareApiError` 400 gives `noteRejected`, 403 `noPermission`, 409 `filedElsewhere`; anything else `filingFailed`.

- [ ] **Step 2: Update `src/strings.ts`**

Copy:
- `filing: "Filing the note from Vaarta…"`
- `noteRejected: "CARE couldn't read the note from Vaarta. Publish it again from Vaarta."`
- `noPermission: "You don't have permission to add notes to this encounter."`
- `filedElsewhere: "This note is already filed on another encounter."`
- `filingFailed: "Couldn't file the note from Vaarta. Try again."`
- `retry: "Retry"`

Remove every string only the Rx pad flow used.

- [ ] **Step 3: Verify**

Run: `npm test && npm run typecheck`
Expected: both pass.

- [ ] **Step 4: Commit** `file the note on return instead of opening the rx pad`

### Task 4: Encounter overview widget

**Files:**
- Create: `src/encounter.ts`, `src/components/VaartaWidget.tsx`
- Delete: `src/components/VaartaButton.tsx`
- Modify: `src/manifest.tsx`, `src/types.ts`, `src/strings.ts`
- Test: `test/encounter.test.ts`

**Interfaces:**
- Produces: in `src/encounter.ts`, `isActiveEncounter(status: string): boolean` and `encounterClassLabel(encounterClass: string): string` (the label map moves here from `VaartaButton.tsx`).
- `Encounter` in `src/types.ts` gains `status: string`.
- The manifest maps `EncounterOverviewTop` to `lazy(() => import("@/components/VaartaWidget"))`; `EncounterActions` is removed. The slot passes `{ encounter, patientId, encounterId }`.

- [ ] **Step 1: Write the failing test**

`"treats cancelled, entered_in_error, discontinued and completed as inactive"` and `"treats in_progress and planned as active"`; `"falls back to the raw class when it has no label"`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, `../src/encounter.ts` not found.

- [ ] **Step 3: Implement `src/encounter.ts`**

- [ ] **Step 4: Write `VaartaWidget`**

A bordered card in the overview's style: heading `strings.widgetTitle` ("Vaarta scribe"), a one-line hint `strings.widgetHint` ("Record the consultation in Vaarta; the note is filed here when you publish."), the language and template selects inline, and a Start button that runs today's handoff (`createPublicKey`, `buildHandoffUrl`, same tab). Returns `null` when `!isActiveEncounter(encounter.status)`. Delete `VaartaButton.tsx` and `strings.takeNotes`.

- [ ] **Step 5: Verify**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass; `dist/assets/remoteEntry.js` exists.

- [ ] **Step 6: Commit** `move the vaarta handoff into an encounter overview widget`

### Task 5: Remove the Rx pad flow

**Files:**
- Delete: `src/components/MedicinePick.tsx`, `src/openRxDraft.ts`, `src/rxPad.ts`, `src/useMedicineSearch.ts`, `src/adapter/`, `vaarta-rx.questionnaire.json`, `test/rxPad.test.ts`
- Modify: `src/config.ts`, `src/vite-env.d.ts`, `.env.example`, `README.md`, `src/types.ts`, `package.json` description

- [ ] **Step 1: Delete the files and `rxQuestionnaireSlug` / `VITE_RX_QUESTIONNAIRE_SLUG`; drop types only they used (`Question`, `Questionnaire`, `ResponseValue`, `QuestionnaireFormState`, `Code` if unused)**

- [ ] **Step 2: Rewrite the README's "What it adds" and "Setup" for the widget, the return page, and care_scribe's FHIR endpoint; drop the questionnaire import step**

- [ ] **Step 3: Verify**

Run: `npm test && npm run typecheck && npm run build && grep -rn "rxPad\|questionnaire\|adapter" src test`
Expected: all pass; grep prints nothing.

- [ ] **Step 4: Commit** `drop the rx pad flow now that care_scribe files the note`

### Task 6: Check it in CARE

- [ ] **Step 1:** Build the app (`npm start` on :5180) and run CARE locally with `REACT_ENABLED_APPS=eka-care/care_vaarta@localhost:5180/assets/remoteEntry.js` in `.env.local`.
- [ ] **Step 2:** Open an in-progress encounter's overview: the widget shows above Clinical History; the encounter actions menu has no Vaarta entry. Open a completed encounter: no widget.
- [ ] **Step 3:** Open `/facility/<f>/patient/<p>/encounter/<e>/vaarta/return` with no params: the noDocUrl message and Back to encounter show. Filing against the real endpoint waits on the backend's FHIR endpoint.
