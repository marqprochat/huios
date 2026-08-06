interface DisciplineWithTeacher {
  teacher?: { name: string } | null;
}

export function teacherNames(disciplines: DisciplineWithTeacher[]) {
  const names = disciplines
    .map((discipline) => discipline.teacher?.name)
    .filter((name): name is string => Boolean(name));
  return Array.from(new Set(names)).join(', ');
}
