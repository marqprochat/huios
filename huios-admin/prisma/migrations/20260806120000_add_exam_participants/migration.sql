CREATE TABLE "ExamParticipant" (
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamParticipant_pkey" PRIMARY KEY ("examId", "studentId")
);

CREATE INDEX "ExamParticipant_studentId_idx" ON "ExamParticipant"("studentId");

ALTER TABLE "ExamParticipant" ADD CONSTRAINT "ExamParticipant_examId_fkey"
    FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExamParticipant" ADD CONSTRAINT "ExamParticipant_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
