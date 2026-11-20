import { useEffect, useState } from "react";

import { careApi } from "@/api";
import { FACILITY_EXTENSION } from "@/types";

export type HfrIdState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "missing" }
  | { status: "ready"; hfrId: string };

export function useFacilityHfrId(facilityId: string): HfrIdState {
  const [state, setState] = useState<HfrIdState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    careApi
      .getFacility(facilityId)
      .then((facility) => {
        if (cancelled) return;
        const hfrId = facility.extensions?.[FACILITY_EXTENSION]?.hfr_id;
        setState(hfrId ? { status: "ready", hfrId } : { status: "missing" });
      })
      .catch((err) => {
        console.error("load facility hfr id", err);
        if (!cancelled) setState({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  return state;
}
