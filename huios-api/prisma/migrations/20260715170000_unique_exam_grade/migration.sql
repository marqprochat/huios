-- Keep the most recently created grade when legacy data contains more than one
-- grade for the same student/exam pair. Manual grades have a NULL examId and are
-- intentionally excluded: PostgreSQL unique indexes allow multiple NULL values.
BEGIN;

-- Prevent concurrent inserts/updates from recreating duplicates between cleanup
-- and index creation while still allowing readers during the migration.
LOCK TABLE "Grade" IN SHARE ROW EXCLUSIVE MODE;

WITH "ranked_exam_grades" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "studentId", "examId"
            ORDER BY "createdAt" DESC, "id" DESC
        ) AS "duplicate_rank"
    FROM "Grade"
    WHERE "examId" IS NOT NULL
)
DELETE FROM "Grade"
WHERE "id" IN (
    SELECT "id"
    FROM "ranked_exam_grades"
    WHERE "duplicate_rank" > 1
);

CREATE UNIQUE INDEX "Grade_studentId_examId_key"
ON "Grade"("studentId", "examId");

COMMIT;
