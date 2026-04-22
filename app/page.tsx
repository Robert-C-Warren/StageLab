"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleUpload: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
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
    setPageNumber(1);
    setPageCount(null);
  }

  useEffect(() => {
    if (!fileUrl) return;

    let cancelled = false;
    const pdfUrl = fileUrl;

    async function loadPdfPage() {
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

      if (cancelled) return;

      setPageCount(pdf.numPages);

      const safePageNumber = Math.min(Math.max(pageNumber, 1), pdf.numPages);
      const page = await pdf.getPage(safePageNumber);

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

    loadPdfPage().catch((err) => {
      console.error(err);
      setError("PDF render failed");
    });

    return () => {
      cancelled = true;
    };
  }, [fileUrl, pageNumber]);

  const canGoPrev = pageNumber > 1;
  const canGoNext = pageCount !== null && pageNumber < pageCount;

  return (
    <main className="p-6 space-y-4">
      <form onSubmit={handleUpload} className="flex items-center gap-3">
        <input type="file" name="file" accept="application/pdf" />
        <button type="submit" className="border px-3 py-1">
          Upload
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {fileUrl && (
        <div className="space-y-2">
          <p className="text-sm">{fileUrl}</p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={!canGoPrev}
              className="border px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm">
              Page {pageNumber}{pageCount ? ` of ${pageCount}` : ""}
            </span>

            <button
              type="button"
              onClick={() =>
                setPageNumber((p) =>
                  pageCount ? Math.min(pageCount, p + 1) : p + 1
                )
              }
              disabled={!canGoNext}
              className="border px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="border" />
    </main>
  );
}