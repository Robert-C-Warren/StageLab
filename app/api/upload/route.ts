import { mkdir, writeFile } from "fs/promises";
import path from "path";

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const data = await req.formData();
  const file = data.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!file.name || file.size === 0) {
    return Response.json({ error: "Invalid file" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return Response.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = safeFileName(file.name);
  const filePath = path.join(uploadsDir, fileName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await writeFile(filePath, buffer);

  return Response.json({
    success: true,
    file: `/uploads/${fileName}`,
  });
}