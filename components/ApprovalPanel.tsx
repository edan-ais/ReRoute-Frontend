// components/ApprovalPanel.tsx
"use client";

import type { RerouteProposal } from "../lib/types";

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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Agent Reroute Approvals</h2>
          <p className="mt-1 text-xs text-slate-400">
            For each flight, you can read the{" "}
            <span className="font-semibold text-slate-200">
              ICAO flight plan
            </span>{" "}
            before and after reroute.
          </p>
        </div>
        <button
          type="button"
          onClick={onApproveAll}
          disabled={!hasProposals || isApplying}
          className={`btn px-3 py-1.5 text-xs ${
            !hasProposals || isApplying ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {isApplying ? "Applying..." : "Approve & Apply All"}
        </button>
      </div>

      {!hasProposals ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-3 py-4 text-xs text-slate-400">
          No reroutes required for the current sector conditions. Adjust the
          emergency scenario to stress the system and generate new proposals.
        </div>
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">
                      {p.callsign}
                    </span>
                    {p.applied && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        APPLIED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>
                      Risk:{" "}
                      <span className="text-amber-300">
                        {(p.riskBefore * 100).toFixed(0)}
                      </span>{" "}
                      →{" "}
                      <span className="text-emerald-300">
                        {(p.riskAfter * 100).toFixed(0)}
                      </span>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>{new Date(p.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-md bg-slate-900/80 p-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Before – ICAO Flight Plan
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-200">
{p.icaoBefore}
                  </pre>
                </div>

                <div className="rounded-md bg-slate-900/80 p-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    After – ICAO Flight Plan
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-[11px] text-emerald-200">
{p.icaoAfter}
                  </pre>
                </div>
              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                {p.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
