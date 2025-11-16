"use client";

import ApprovalPanel from "../../components/ApprovalPanel";
import type { RerouteProposal } from "../../lib/types";

const mockProposals: RerouteProposal[] = [
  {
    id: "prop-1",
    flightId: "AA123",
    callsign: "AA123",
    currentRoute: "KLAX DCT FIX1 KJFK",
    proposedRoute: "KLAX DCT REROUTE1 DCT KJFK",
    icaoBefore: `FPL-AA123-IS
-C/B738/M-SDFGIRWY/S
-KLAX0800
-N0450F350 KLAX DCT FIX1 KJFK
-KJFK0200
-DOF/250115`,
    icaoAfter: `FPL-AA123-IS
-C/B738/M-SDFGIRWY/S
-KLAX0800
-N0450F310 KLAX DCT REROUTE1 DCT KJFK
-KJFK0200
-DOF/250115`,
    riskBefore: 0.72,
    riskAfter: 0.34,
    reason:
      "Avoids convective activity in the corridor.",
    createdAt: new Date().toISOString(),
    applied: false
  }
];

export default function ApprovalsPage() {
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Reroute Approvals</h1>
      <ApprovalPanel
        proposals={mockProposals}
        onApproveAll={() => {}}
        isApplying={false}
      />
    </div>
  );
}
