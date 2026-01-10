-- CreateTable
CREATE TABLE "SessionLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionLike_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coachId" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "maxParticipants" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("coachId", "createdAt", "description", "endedAt", "id", "isPublic", "maxParticipants", "mediaType", "mediaUrl", "scheduledAt", "startedAt", "status", "title", "updatedAt") SELECT "coachId", "createdAt", "description", "endedAt", "id", "isPublic", "maxParticipants", "mediaType", "mediaUrl", "scheduledAt", "startedAt", "status", "title", "updatedAt" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_coachId_idx" ON "Session"("coachId");
CREATE INDEX "Session_status_idx" ON "Session"("status");
CREATE INDEX "Session_scheduledAt_idx" ON "Session"("scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SessionLike_sessionId_createdAt_idx" ON "SessionLike"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionLike_sessionId_userId_createdAt_idx" ON "SessionLike"("sessionId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionLike_userId_createdAt_idx" ON "SessionLike"("userId", "createdAt");

