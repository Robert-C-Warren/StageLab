"use client";

import { useEffect, useRef, useState } from "react";

type StageCard = {
	id: string;
	sourcePdfId: string;
	name: string | null;
	pageNumber: number;
	cropX: number;
	cropY: number;
	cropWidth: number;
	cropHeight: number;
	imagePath: string | null;
	createdAt: string; // comes back as ISO string from API
};

export default function Home() {
	const [fileUrl, setFileUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [pageCount, setPageCount] = useState<number | null>(null);
	const [sourcePdfId, setSourcePdfId] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [start, setStart] = useState<{ x: number; y: number } | null>(null);
	const [end, setEnd] = useState<{ x: number; y: number } | null>(null);
	const [stageCards, setStageCards] = useState<StageCard[]>([]);

	const pageCountSavedRef = useRef(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const snapshotRef = useRef<ImageData | null>(null);
	const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

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

		pageCountSavedRef.current = false;
		setFileUrl(data.file);
		setSourcePdfId(data.sourcePdfId);
		setPageNumber(1);
		setPageCount(null);
	};

	useEffect(() => {
		if (!fileUrl) return;

		let cancelled = false;

		async function loadPdfPage() {
			const canvas = canvasRef.current;
			const pdfUrl = fileUrl;

			if (!canvas || !pdfUrl) return;

			const context = canvas.getContext("2d");
			if (!context) return;

			const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");

			pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

			const pdf = await pdfjsLib.getDocument(pdfUrl).promise;

			if (cancelled) return;

			setPageCount(pdf.numPages);

			if (sourcePdfId && !pageCountSavedRef.current) {
				pageCountSavedRef.current = true;

				await fetch(`/api/source-pdf/${sourcePdfId}/page-count`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ pageCount: pdf.numPages }),
				});
			}

			const page = await pdf.getPage(pageNumber);

			const viewport = page.getViewport({ scale: 1.5 });

			canvas.width = Math.ceil(viewport.width);
			canvas.height = Math.ceil(viewport.height);

			renderTaskRef.current?.cancel();

			const renderTask = page.render({
				canvas,
				canvasContext: context,
				viewport,
			});

			renderTaskRef.current = renderTask;

			try {
				await renderTask.promise;
			} catch (err) {
				if (err instanceof Error && err.name === "RenderingCancelledException") {
					return;
				}

				throw err;
			}

			if (cancelled) return;

			snapshotRef.current = context.getImageData(0, 0, canvas.width, canvas.height);

			if (renderTaskRef.current === renderTask) {
				renderTaskRef.current = null;
			}
		}

		loadPdfPage();

		return () => {
			cancelled = true;
			renderTaskRef.current?.cancel();
			renderTaskRef.current = null;
		};
	}, [fileUrl, pageNumber, sourcePdfId]);

	useEffect(() => {
		if (!sourcePdfId) return;

		async function loadStageCards() {
			const res = await fetch(`/api/stage-cards?sourcePdfId=${sourcePdfId}`);
			const data: StageCard[] = await res.json();
			setStageCards(data);
		}

		loadStageCards();
	}, [sourcePdfId]);

	useEffect(() => {
		if (!start || !end) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const context = canvas.getContext("2d");
		if (!context) return;

		const snapshot = snapshotRef.current;
		if (!snapshot) return;

		// restore clean PDF
		context.putImageData(snapshot, 0, 0);

		const x = Math.min(start.x, end.x);
		const y = Math.min(start.y, end.y);
		const w = Math.abs(start.x - end.x);
		const h = Math.abs(start.y - end.y);

		context.strokeStyle = "red";
		context.lineWidth = 2;

		context.strokeRect(x, y, w, h);
	}, [start, end]);

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
						<button type="button" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={!canGoPrev} className="border px-3 py-1 disabled:opacity-50">
							Previous
						</button>

						<span className="text-sm">
							Page {pageNumber}
							{pageCount ? ` of ${pageCount}` : ""}
						</span>

						<button type="button" onClick={() => setPageNumber((p) => (pageCount ? Math.min(pageCount, p + 1) : p + 1))} disabled={!canGoNext} className="border px-3 py-1 disabled:opacity-50">
							Next
						</button>
					</div>
				</div>
			)}

			<canvas
				ref={canvasRef}
				className="border"
				onMouseDown={(e) => {
					const rect = e.currentTarget.getBoundingClientRect();
					setStart({
						x: e.clientX - rect.left,
						y: e.clientY - rect.top,
					});
					setEnd(null);
					setIsDragging(true);
				}}
				onMouseMove={(e) => {
					if (!isDragging || !start) return;

					const rect = e.currentTarget.getBoundingClientRect();
					setEnd({
						x: e.clientX - rect.left,
						y: e.clientY - rect.top,
					});
				}}
				onMouseUp={async () => {
					setIsDragging(false);

					if (!start || !end || !canvasRef.current) return;

					const canvas = canvasRef.current;
					const res = await fetch(`/api/stage-cards?sourcePdfId=${sourcePdfId}`);
					const data = await res.json();

					const x = Math.min(start.x, end.x);
					const y = Math.min(start.y, end.y);
					const w = Math.abs(start.x - end.x);
					const h = Math.abs(start.y - end.y);

					if (w < 5 || h < 5) return;

					const cropCanvas = document.createElement("canvas");
					cropCanvas.width = w;
					cropCanvas.height = h;

					const cropContext = cropCanvas.getContext("2d");
					if (!cropContext) return;

					cropContext.drawImage(canvas, x, y, w, h, 0, 0, w, h);

					const blob = await new Promise<Blob | null>((resolve) => {
						cropCanvas.toBlob(resolve, "image/png");
					});

					if (!blob) return;

					setStageCards(data);

					const normalized = {
						cropX: x / canvas.width,
						cropY: y / canvas.height,
						cropWidth: w / canvas.width,
						cropHeight: h / canvas.height,
					};

					if (!sourcePdfId) return;

					const formData = new FormData();

					formData.append("sourcePdfId", sourcePdfId);
					formData.append("pageNumber", String(pageNumber));
					formData.append("cropX", String(normalized.cropX));
					formData.append("cropY", String(normalized.cropY));
					formData.append("cropWidth", String(normalized.cropWidth));
					formData.append("cropHeight", String(normalized.cropHeight));
					formData.append("image", blob, `stage-${Date.now()}.png`);

					await fetch("/api/stage-cards", {
						method: "POST",
						body: formData,
					});

					setStart(null);
					setEnd(null);
				}}
			/>

			{stageCards.length > 0 && (
				<div className="space-y-2">
					<h2 className="text-sm font-bold">Stage Cards</h2>

					{stageCards.map((stage, i) => (
						<div key={stage.id} className="border p-2 text-xs">
							<div>#{i + 1}</div>
							<div>Page: {stage.pageNumber}</div>
							<div>
								Crop: {stage.cropX.toFixed(2)}, {stage.cropY.toFixed(2)}
							</div>
							{stage.imagePath && (
								<img src={stage.imagePath} alt={`Stage card ${i + 1}`} className="w-48 border" />
							)}
						</div>
					))}
				</div>
			)}
		</main>
	);
}
