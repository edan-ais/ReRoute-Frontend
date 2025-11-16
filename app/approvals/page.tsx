// app/approvals/page.tsx
"use client";

import { useState } from "react";
import ApprovalPanel from "../../components/ApprovalPanel";
import type { RerouteProposal } from "../../lib/types";

const mockProposals: RerouteProposal[] = [
  {
    id: "prop-1",
    flightId: "AA123",
    callsign: "AA123",
    currentRoute: "KLAX DCT PGS J146 TBC J18 HBU J60 LBF J94 OBH J10 DBQ J60 JOT KJFK",
    proposedRoute:
      "KLAX DCT PGS J146 TBC J18 HBU J60 LBF J94 OBH J10 PMM J60 JOT KJFK",
    riskBefore: 0.72,
    riskAfter: 0.34,
    reason:
      "Reroute around central convective band.",
    createdAt: new Date().toISOString(),
    applied: false
  }
];

export default function ApprovalsPage() {
  const [proposals, setProposals] = useState<RerouteProposal[]>(mockProposals);
  const [isApplying, setIsApplying] = useState(false);

  const handleApproveAll = () => {
    setIsApplying(true);
    setProposals((prev) =>
      prev.map((p) => ({
        ...p,
        applied: true
      }))
    );
    setTimeout(() => {
      setIsApplying(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Reroute Approvals
      </h1>

      <ApprovalPanel
        proposals={proposals}
        onApproveAll={handleApproveAll}
        isApplying={isApplying}
      />
    </div>
  );
}
