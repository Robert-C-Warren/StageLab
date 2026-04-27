import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const stage = await prisma.stageCard.create({
            data:{
                sourcePdfId: body.sourcePdfId,
                pageNumber: Number(body.pageNumber),
                cropX: Number(body.cropX),
                cropY: Number(body.cropY),
                cropWidth: Number(body.cropWidth),
                cropHeight: Number(body.cropHeight),
                name: body.name ?? null,
            },
        });

        return Response.json(stage);
    } catch (err) {
        console.error("Create stage card failed:", err);
        return Response.json({ error: "Create stage card failed" }, { status: 500 });
    }
}