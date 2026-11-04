import { useState } from "react";

import { strings } from "@/strings";
import { Code } from "@/types";
import { useMedicineSearch } from "@/useMedicineSearch";

interface Props {
  scribeName: string;
  todo: string[];
  pick: Code | null | undefined;
  onPick: (pick: Code | null | undefined) => void;
}

// One scribe medicine: its CARE medicine once chosen, else a search to choose one.
export function MedicinePick({ scribeName, todo, pick, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(scribeName);
  const { results, error } = useMedicineSearch(open ? search : "");

  return (
    <li className="space-y-2 rounded-lg border border-gray-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-gray-500">{strings.scribeSaid(scribeName)}</p>
          {pick ? (
            <p className="font-medium">{pick.display}</p>
          ) : pick === null ? (
            <p className="text-gray-400 line-through">{scribeName}</p>
          ) : (
            <button
              type="button"
              className="font-medium text-red-600 underline"
              onClick={() => setOpen(true)}
            >
              {strings.chooseMedicine}
            </button>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {pick !== undefined && (
            <button
              type="button"
              className="text-gray-500 underline"
              onClick={() => {
                onPick(undefined);
                setOpen(true);
              }}
            >
              {strings.change}
            </button>
          )}
          {pick !== null && (
            <button
              type="button"
              className="text-gray-500 underline"
              onClick={() => {
                onPick(null);
                setOpen(false);
              }}
            >
              {strings.leaveOut}
            </button>
          )}
        </div>
      </div>
      {todo.length > 0 && pick !== null && (
        <p className="text-amber-700">{strings.setInRxPad(todo)}</p>
      )}
      {open && pick === undefined && (
        <div className="space-y-1">
          <input
            autoFocus
            className="w-full rounded-md border border-gray-300 px-2 py-1.5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={strings.searchMedicines}
          />
          {error && <p className="text-red-600">{strings.searchFailed}</p>}
          <ul className="max-h-56 overflow-y-auto rounded-md border border-gray-200">
            {results.map((r) => (
              <li key={`${r.system}|${r.code}`}>
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left hover:bg-gray-100"
                  onClick={() => {
                    onPick({
                      system: r.system,
                      code: r.code,
                      display: r.display,
                    });
                    setOpen(false);
                  }}
                >
                  {r.display}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
