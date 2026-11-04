import { useEffect, useState } from "react";

import { careApi } from "@/api";
import { Code } from "@/types";

// The same search CARE's Rx pad runs when a doctor types a medicine name.
export function useMedicineSearch(search: string) {
  const [results, setResults] = useState<Code[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!search.trim()) return setResults([]);
    let cancelled = false;
    const timer = setTimeout(() => {
      careApi
        .searchValueSet("system-medication", `${search} clinical drug`, 10)
        .then(
          ({ results }) => !cancelled && (setResults(results), setError(false)),
        )
        .catch((err) => {
          console.warn(`search care medicines "${search}"`, err);
          if (!cancelled) setError(true);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return { results, error };
}
