export interface ExamWriteInput {
  title: string;
  description: string | null;
  disciplineId: string;
  startDate: Date;
  endDate: Date;
  duration: number | null;
}

interface DuplicateExamSource extends ExamWriteInput {
  maxAttempts: number;
  questions: Array<{
    statement: string;
    type: 'MULTIPLE_CHOICE';
    order: number;
    weight: number;
    alternatives: Array<{
      letter: string;
      text: string;
      isCorrect: boolean;
    }>;
  }>;
  participants: Array<{ studentId: string }>;
}

export function buildCreateExamData(input: ExamWriteInput, studentIds: string[]) {
  return {
    ...input,
    isPublished: false,
    participants: {
      create: studentIds.map(studentId => ({ studentId })),
    },
  };
}

export function buildDuplicateExamData(
  original: DuplicateExamSource,
  overrides: { title: string; startDate: Date; endDate: Date },
) {
  return {
    title: overrides.title,
    description: original.description,
    disciplineId: original.disciplineId,
    startDate: overrides.startDate,
    endDate: overrides.endDate,
    duration: original.duration,
    maxAttempts: original.maxAttempts,
    isPublished: false,
    participants: {
      create: original.participants.map(({ studentId }) => ({ studentId })),
    },
    questions: {
      create: original.questions.map(question => ({
        statement: question.statement,
        type: question.type,
        order: question.order,
        weight: question.weight,
        alternatives: {
          create: question.alternatives.map(alternative => ({
            letter: alternative.letter,
            text: alternative.text,
            isCorrect: alternative.isCorrect,
          })),
        },
      })),
    },
  };
}

export function assertExamCanBePublished(participantCount: number): void {
  if (participantCount === 0) {
    throw new Error('Selecione ao menos um aluno antes de publicar a prova.');
  }
}
