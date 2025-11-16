// components/ApprovalPanel.tsx
"use client";

import type { RerouteProposal } from "../lib/types";
import RiskBadge from "./RiskBadge";

interface ApprovalPanelProps {
  proposals: RerouteProposal[];
  onApproveAll: () => void;
  isApplying: boolean;
}

export default function ApprovalPanel({
  proposals,
  onApproveAll,
  isApplying
}: ApprovalPanelProps) {
  const hasProposals = proposals.length > 0;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Reroute Approvals</h2>
        </div>
        <button
          type="button"
          disabled={!hasProposals || isApplying}
          onClick={onApproveAll}
          className={`btn text-xs ${
            !hasProposals || isApplying
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {isApplying ? "Applying…" : "Approve & Apply All"}
        </button>
      </header>

      {!hasProposals && (
        <p className="text-xs text-slate-500">
          No active reroutes for the current sector view.
        </p>
      )}

      <div className="space-y-3">
        {proposals.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-slate-100">
                {p.callsign} · {p.flightId}
              </div>
              <div className="flex items-center gap-2">
                <RiskBadge value={p.riskBefore} />
                <span className="text-slate-500">→</span>
                <RiskBadge value={p.riskAfter} />
              </div>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase text-slate-500">
                  Current route
                </div>
                <div className="mt-0.5 text-[11px] text-slate-200">
                  {p.currentRoute}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">
                  Proposed route
                </div>
                <div className="mt-0.5 text-[11px] text-emerald-200">
                  {p.proposedRoute}
                </div>
              </div>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              {p.reason}
            </p>

            <p className="mt-1 text-[10px] text-slate-500">
              {new Date(p.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
