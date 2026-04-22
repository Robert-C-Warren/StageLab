"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

export default function Home() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }

    setFileUrl(data.file);
  }

  useEffect(() => {
  if (!fileUrl) return;

  let cancelled = false;
  const pdfUrl = fileUrl;

  async function loadPdf() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");

    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    if (cancelled) return;

    const viewport = page.getViewport({ scale: 1.5 });

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
    });

    await renderTask.promise;
  }

  loadPdf().catch((err) => {
    console.error(err);
    setError("PDF render failed");
  });

  return () => {
    cancelled = true;
  };
}, [fileUrl]);

  return (
    <main className="p-6 space-y-4">
      <form onSubmit={handleUpload} className="flex items-center gap-3">
        <input type="file" name="file" accept="application/pdf" />
        <button type="submit" className="border px-3 py-1">
          Upload
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {fileUrl && <p className="text-sm">{fileUrl}</p>}

      <canvas ref={canvasRef} className="border" />
    </main>
  );
}