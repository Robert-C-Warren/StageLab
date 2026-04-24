import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const body = await req.json();

		const pageCount = Number(body.pageCount);

		if (!Number.isInteger(pageCount) || pageCount < 1) {
			return Response.json({ error: "Invalid page count" }, { status: 400 });
		}

		const sourcePdf = await prisma.sourcePdf.update({
			where: { id },
			data: { pageCount },
		});

		return Response.json(sourcePdf);
	} catch (err) {
		console.error("PATCH page-count failed:", err);
		return Response.json({ error: "Page count update failed" }, { status: 500 });
	}
}
