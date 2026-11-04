import { useState } from "react";

import { config } from "@/config";
import { createPublicKey } from "@/crypto";
import { encounterClassLabel, isActiveEncounter } from "@/encounter";
import { buildHandoffUrl } from "@/handoff";
import { LANGUAGES, TEMPLATES } from "@/scribeOptions";
import { strings } from "@/strings";
import { Encounter } from "@/types";

interface Props {
  encounter: Encounter;
  patientId: string;
  encounterId: string;
}

const SELECT_CLASS =
  "min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm";

export default function VaartaWidget({ encounter }: Props) {
  const [language, setLanguage] = useState(LANGUAGES[0].code);
  const [template, setTemplate] = useState(TEMPLATES[0].id);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  if (!isActiveEncounter(encounter.status)) return null;

  // Same tab: Vaarta sends this tab back to callback_url on publish, so the doctor ends where they began.
  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const publicKey = await createPublicKey();
      window.location.assign(
        buildHandoffUrl(config.vaartaUrl, {
          encounterId: encounter.id,
          title: `${encounter.patient.name} · ${encounterClassLabel(encounter.encounter_class)}`,
          attendees: [
            `${encounter.patient.name} (patient)`,
            ...encounter.care_team.map(({ member }) =>
              `${member.first_name} ${member.last_name}`.trim(),
            ),
          ].join(", "),
          languageHint: language,
          templates: template,
          callbackUrl: `${window.location.origin}/facility/${encounter.facility.id}/patient/${encounter.patient.id}/encounter/${encounter.id}/vaarta/return`,
          publicKey,
        }),
      );
    } catch (err) {
      console.error("start vaarta handoff", err);
      setError(strings.handoffFailed);
      setStarting(false);
    }
  };

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-600">
        {strings.widgetTitle}
      </h2>
      <div className="rounded-xl bg-gray-100 p-1.5">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-3 shadow">
          <p className="text-sm text-gray-600">{strings.widgetHint}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-medium text-gray-700">
              {strings.language}
              <select
                className={SELECT_CLASS}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-medium text-gray-700">
              {strings.template}
              <select
                className={SELECT_CLASS}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                {TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={starting}
              className="rounded-md bg-primary-700 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              onClick={start}
            >
              {strings.start}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </section>
  );
}
