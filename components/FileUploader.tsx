"use client";

import { useState } from "react";

export default function FileUploader() {
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatus(null);
    setUploading(true);

    try {
      const ingestionUrl =
        process.env.NEXT_PUBLIC_INGESTION_URL ||
        "https://example-ingestion-server.com/ingest";

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(ingestionUrl, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Ingestion failed with status ${res.status}`);
      }

      setStatus("Upload complete. Files sent to ingestion server.");
    } catch (err: any) {
      console.error(err);
      setStatus(
        err?.message || "Upload failed. Check the ingestion server and URL."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-200">
        Upload data files
      </label>

      <input
        type="file"
        multiple
        onChange={handleFilesSelected}
        className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-sky-600 file:text-white hover:file:bg-sky-500"
      />

      <p className="text-xs text-slate-400">
        CSV, JSON, PDFs, or images. These are streamed to your ingestion server
        for normalization and storage.
      </p>

      {uploading && (
        <p className="text-xs text-sky-400 animate-pulse">Uploading…</p>
      )}

      {status && <p className="text-xs text-slate-200">{status}</p>}
    </div>
  );
}
