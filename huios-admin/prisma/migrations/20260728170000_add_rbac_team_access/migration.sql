-- Create RBAC tables.
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Keep these additions nullable for the existing records.
ALTER TABLE "User" ADD COLUMN "adminRoleId" TEXT;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TeamMember" ADD COLUMN "userId" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

ALTER TABLE "User" ADD CONSTRAINT "User_adminRoleId_fkey"
    FOREIGN KEY ("adminRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fixed UUIDs make this seed independent of database UUID extensions and rerunnable.
INSERT INTO "Role" ("id", "key", "name", "active", "protected", "createdAt", "updatedAt") VALUES
    ('a6f463e4-b457-4d2d-b4d2-1b4a7852b001', 'SUPER_ADMIN', 'Super Admin', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a6f463e4-b457-4d2d-b4d2-1b4a7852b002', 'COORDENADOR', 'Coordenador', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a6f463e4-b457-4d2d-b4d2-1b4a7852b003', 'SECRETARIA', 'Secretaria', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a6f463e4-b457-4d2d-b4d2-1b4a7852b004', 'FINANCEIRO', 'Financeiro', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a6f463e4-b457-4d2d-b4d2-1b4a7852b005', 'PROFESSOR', 'Professor', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a6f463e4-b457-4d2d-b4d2-1b4a7852b006', 'MONITOR', 'Monitor', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "protected" = EXCLUDED."protected";

-- Preserve the legacy role column while assigning a single administrative role.
UPDATE "User" AS "user"
SET "adminRoleId" = "role"."id"
FROM "Role" AS "role"
WHERE UPPER("user"."role") = "role"."key"
  AND UPPER("user"."role") <> 'ALUNO';

-- Link only a case-insensitive email match that is unique on both sides.
WITH "candidatePairs" AS (
    SELECT
        "teamMember"."id" AS "teamMemberId",
        "user"."id" AS "userId",
        COUNT(*) OVER (PARTITION BY "teamMember"."id") AS "userMatchCount",
        COUNT(*) OVER (PARTITION BY "user"."id") AS "teamMemberMatchCount"
    FROM "TeamMember" AS "teamMember"
    INNER JOIN "User" AS "user" ON LOWER("teamMember"."email") = LOWER("user"."email")
)
UPDATE "TeamMember" AS "teamMember"
SET "userId" = "candidatePairs"."userId"
FROM "candidatePairs"
WHERE "teamMember"."id" = "candidatePairs"."teamMemberId"
  AND "teamMember"."userId" IS NULL
  AND "candidatePairs"."userMatchCount" = 1
  AND "candidatePairs"."teamMemberMatchCount" = 1;
