import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const sourcePdfId = formData.get("sourcePdfId") as string;
        const pageNumber = Number(formData.get("pageNumber"));
        const cropX = Number(formData.get("cropX"));
        const cropY = Number(formData.get("cropY"));
        const cropWidth = Number(formData.get("cropWidth"));
        const cropHeight = Number(formData.get("cropHeight"));
        const file = formData.get("image");

        if (!(file instanceof File)) {
            return Response.json({ error: "Missing image file" }, { status: 400 });
        }

        // -- IMAGE SAVE --
        const uploadsDir = path.join(process.cwd(), "public", "stage-cards");
        await mkdir(uploadsDir, { recursive: true });

        const fileName = `${Date.now()}.png`;
        const filePath = path.join(uploadsDir, fileName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        await writeFile(filePath, buffer);

        // -- Save DB Record
        const stage = await prisma.stageCard.create({
            data: {
                sourcePdfId,
                pageNumber,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                imagePath: `/stage-cards/${fileName}`,
                name: null,
            },
        });

        return Response.json(stage) 
    } catch (err) {
        console.error("Create stage card failed:", err);
        return Response.json({ error: "Create stage card failed" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const sourcePdfId = searchParams.get("sourcePdfId");

    if (!sourcePdfId) {
        return Response.json({error:  "Missing sourcePdfId" }, { status: 400 });
    }

    const stages = await prisma.stageCard.findMany({
        where: { sourcePdfId },
        orderBy: { createdAt: "asc" },
    });

    return Response.json(stages);
}