-- CreateTable
CREATE TABLE "SourcePdf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "pageCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PdfPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourcePdfId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imagePath" TEXT,
    CONSTRAINT "PdfPage_sourcePdfId_fkey" FOREIGN KEY ("sourcePdfId") REFERENCES "SourcePdf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StageCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourcePdfId" TEXT NOT NULL,
    "name" TEXT,
    "pageNumber" INTEGER NOT NULL,
    "cropX" REAL NOT NULL,
    "cropY" REAL NOT NULL,
    "cropWidth" REAL NOT NULL,
    "cropHeight" REAL NOT NULL,
    "imagePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageCard_sourcePdfId_fkey" FOREIGN KEY ("sourcePdfId") REFERENCES "SourcePdf" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PdfPage_sourcePdfId_pageNumber_key" ON "PdfPage"("sourcePdfId", "pageNumber");
