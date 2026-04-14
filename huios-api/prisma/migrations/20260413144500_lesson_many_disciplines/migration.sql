-- CreateTable
CREATE TABLE "_DisciplineToLesson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DisciplineToLesson_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DisciplineToLesson_B_index" ON "_DisciplineToLesson"("B");

-- AddForeignKey
ALTER TABLE "_DisciplineToLesson" ADD CONSTRAINT "_DisciplineToLesson_A_fkey" FOREIGN KEY ("A") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DisciplineToLesson" ADD CONSTRAINT "_DisciplineToLesson_B_fkey" FOREIGN KEY ("B") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: Copy existing disciplineId to the new join table
INSERT INTO "_DisciplineToLesson" ("A", "B") 
SELECT "disciplineId", "id" FROM "Lesson"
WHERE "disciplineId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_disciplineId_fkey";

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "disciplineId";
