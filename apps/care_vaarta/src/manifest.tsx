import { lazy } from "react";

import { VaartaReturnPage } from "@/components/VaartaReturnPage";

const manifest = {
  plugin: "care_vaarta",
  routes: {
    "/facility/:facilityId/patient/:patientId/encounter/:encounterId/vaarta/return":
      ({
        facilityId,
        patientId,
        encounterId,
      }: {
        facilityId: string;
        patientId: string;
        encounterId: string;
      }) => (
        <VaartaReturnPage
          facilityId={facilityId}
          patientId={patientId}
          encounterId={encounterId}
        />
      ),
  },
  components: {
    EncounterActions: lazy(() => import("@/components/VaartaButton")),
  },
  extends: [],
  navItems: [],
};

export default manifest;
