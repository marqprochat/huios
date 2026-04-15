-- Step 1: Create the implicit many-to-many join table for Discipline <-> CourseClass
CREATE TABLE "_CourseClassToDiscipline" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Step 2: Create unique index on the join table
CREATE UNIQUE INDEX "_CourseClassToDiscipline_AB_unique" ON "_CourseClassToDiscipline"("A", "B");

-- Step 3: Create index on B for reverse lookups
CREATE INDEX "_CourseClassToDiscipline_B_index" ON "_CourseClassToDiscipline"("B");

-- Step 4: Migrate existing data - copy courseClassId relationships to the join table
INSERT INTO "_CourseClassToDiscipline" ("A", "B")
SELECT "courseClassId", "id"
FROM "Discipline"
WHERE "courseClassId" IS NOT NULL;

-- Step 5: Add foreign key constraints
ALTER TABLE "_CourseClassToDiscipline" ADD CONSTRAINT "_CourseClassToDiscipline_A_fkey" FOREIGN KEY ("A") REFERENCES "CourseClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CourseClassToDiscipline" ADD CONSTRAINT "_CourseClassToDiscipline_B_fkey" FOREIGN KEY ("B") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add the year column to Discipline
ALTER TABLE "Discipline" ADD COLUMN "year" INTEGER;

-- Step 7: Set year = 2026 for all existing disciplines
UPDATE "Discipline" SET "year" = 2026;

-- Step 8: Drop the old foreign key constraint and column
ALTER TABLE "Discipline" DROP CONSTRAINT IF EXISTS "Discipline_courseClassId_fkey";
ALTER TABLE "Discipline" DROP COLUMN "courseClassId";
