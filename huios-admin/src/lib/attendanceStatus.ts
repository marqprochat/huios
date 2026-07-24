export type AttendanceSummary = {
  present: number;
  absent: number;
  excused: number;
  pending: number;
  total: number;
};

export type AttendanceApprovalStatus = 'Aguardando' | 'Aprovado' | 'Reprovado';

export function getAttendancePercentage(attendance: AttendanceSummary): number {
  if (attendance.total === 0) return 0;
  return Math.round(
    ((attendance.present + attendance.excused) / attendance.total) * 100,
  );
}

export function getAttendanceApprovalStatus(
  attendance: AttendanceSummary,
  absentForFail = 3,
): AttendanceApprovalStatus {
  if (attendance.absent >= absentForFail) return 'Reprovado';
  if (getAttendancePercentage(attendance) >= 75) return 'Aprovado';
  return 'Aguardando';
}
