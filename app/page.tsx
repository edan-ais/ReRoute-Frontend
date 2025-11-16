// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        ReRoute Mission Console
      </h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-medium">Live Console</h2>
          <p className="text-sm text-slate-300">
            Open the sector view and monitor active flights.
          </p>
          <Link href="/flights" className="btn mt-auto w-fit">
            Open Console
          </Link>
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-medium">Emergencies</h2>
          <p className="text-sm text-slate-300">
            Step through predefined emergency scenarios.
          </p>
          <Link href="/flights" className="btn mt-auto w-fit">
            View Scenarios
          </Link>
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-medium">Approvals</h2>
          <p className="text-sm text-slate-300">
            Review and apply reroute proposals.
          </p>
          <Link href="/approvals" className="btn mt-auto w-fit">
            Go to Approvals
          </Link>
        </div>
      </div>
    </div>
  );
}
