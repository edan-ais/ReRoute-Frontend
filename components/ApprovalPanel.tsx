"use client";

import type { RerouteProposal } from "../lib/types";
import RiskBadge from "./RiskBadge";
import { useState } from "react";

interface Props {
  proposals: RerouteProposal[];
}

export default function ApprovalPanel({ proposals }: Props) {
  const [local, setLocal] = useState(proposals);

  function handleDecision(id: string, decision: "approve" | "reject") {
    // Placeholder – in future call your agent server / backend
    console.log(`Decision for ${id}: ${decision}`);
    setLocal((prev) => prev.filter((p) => p.id !== id));
  }

  if (local.length === 0) {
    return (
      <div className="card">
        <p className="text-sm text-slate-300">
          No pending reroute proposals. The sector is currently stable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {local.map((p) => (
        <div key={p.id} className="card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{p.callsign}</span>
              <RiskBadge score={p.riskAfter} />
            </div>
            <span className="text-[10px] text-slate-500">
              Proposed {new Date(p.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Risk reduction:{" "}
            <span className="text-slate-200">
              {(p.riskBefore * 100).toFixed(0)}% →{" "}
              {(p.riskAfter * 100).toFixed(0)}%
            </span>
          </p>
          <p className="text-[11px] text-slate-400">
            Reason: {p.reason || "N/A"}
          </p>
          <div className="mt-2 grid gap-2 text-[11px] md:grid-cols-2">
            <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800">
              <p className="font-semibold mb-1 text-slate-200 text-[11px]">
                Current route
              </p>
              <p className="text-[11px] text-slate-400 break-words">
                {p.currentRoute}
              </p>
            </div>
            <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800">
              <p className="font-semibold mb-1 text-slate-200 text-[11px]">
                Proposed route
              </p>
              <p className="text-[11px] text-slate-400 break-words">
                {p.proposedRoute}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              className="btn text-xs"
              onClick={() => handleDecision(p.id, "approve")}
            >
              Approve reroute
            </button>
            <button
              className="btn-secondary text-xs"
              onClick={() => handleDecision(p.id, "reject")}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
