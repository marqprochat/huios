export type UserRole = 'ALUNO' | 'MONITOR' | 'COORDENADOR' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  student?: Student;
}

export interface Student {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  enrollments?: Enrollment[];
}

export interface Enrollment {
  id: string;
  status: 'CURSANDO' | 'TRANCADO' | 'APROVADO' | 'REPROVADO';
  courseClass: CourseClass;
}

export interface CourseClass {
  id: string;
  name: string;
  course: { id: string; name: string };
}

export interface Lesson {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  discipline?: { id: string; name: string };
  attendance?: Attendance;
}

export interface Attendance {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'PENDING';
  checkInAt?: string;
  checkOutAt?: string;
  distance?: number;
}

export interface Exam {
  id: string;
  title: string;
  deadline?: string;
  durationMinutes?: number;
  discipline?: { id: string; name: string };
  submission?: ExamSubmission;
}

export interface ExamSubmission {
  id: string;
  score?: number;
  submittedAt: string;
}

export interface Question {
  id: string;
  text: string;
  alternatives: Alternative[];
}

export interface Alternative {
  id: string;
  text: string;
}

export interface Grade {
  disciplineId: string;
  disciplineName: string;
  value?: number;
  examScore?: number;
  finalGrade?: number;
}

export interface AbsenceSummary {
  disciplineId: string;
  disciplineName: string;
  totalLessons: number;
  absences: number;
  attendanceRate: number;
  status: 'OK' | 'NEEDS_JUSTIFICATION' | 'AUTO_FAILED';
  pendingJustifications: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
