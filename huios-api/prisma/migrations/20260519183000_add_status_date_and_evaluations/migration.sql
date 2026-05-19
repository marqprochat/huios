-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "statusDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Enrollment" ADD COLUMN "statusReason" TEXT;

-- CreateTable
CREATE TABLE "TeacherEvaluation" (
    "id" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "clarity" TEXT NOT NULL,
    "engagement" TEXT NOT NULL,
    "mastery" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherEvaluationSubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherEvaluationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherEvaluationSubmission_studentId_disciplineId_key" ON "TeacherEvaluationSubmission"("studentId", "disciplineId");

-- AddForeignKey
ALTER TABLE "TeacherEvaluation" ADD CONSTRAINT "TeacherEvaluation_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
