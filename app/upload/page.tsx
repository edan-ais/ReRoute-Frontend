"use client";

import FileUploader from "../../components/FileUploader";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Upload Mission Data
      </h1>
      <p className="text-slate-300 max-w-2xl text-sm">
        Upload CSV, JSON, or other structured files that represent flight
        plans and sector conditions. These are sent to your ingestion server,
        which normalizes and stores them in Supabase.
      </p>

      <div className="card">
        <FileUploader />
      </div>
    </div>
  );
}
