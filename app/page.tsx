import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        ReRoute Mission Console
      </h1>
      <p className="text-slate-300 max-w-2xl">
        Upload flight plans and sector conditions, visualize active flights,
        and review agent-proposed reroutes with human-in-the-loop approvals.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-medium">1. Upload data</h2>
          <p className="text-sm text-slate-300">
            Ingest flight plans and scenario data to populate the mission
            context for this session.
          </p>
          <Link href="/upload" className="btn mt-auto w-fit">
            Go to Upload
          </Link>
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-medium">2. Monitor flights</h2>
          <p className="text-sm text-slate-300">
            View all flights in the sector with risk scores and live status.
          </p>
          <Link href="/flights" className="btn mt-auto w-fit">
            View Flights
          </Link>
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-medium">3. Approve reroutes</h2>
          <p className="text-sm text-slate-300">
            Review proposed reroutes from the agentic engine and apply them
            with a single click.
          </p>
          <Link href="/approvals" className="btn mt-auto w-fit">
            Review Approvals
          </Link>
        </div>
      </div>
    </div>
  );
}
