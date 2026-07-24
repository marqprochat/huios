export type AttendanceSummary = {
  present: number;
  absent: number;
  excused: number;
  pending: number;
  total: number;
};

export type AttendanceApprovalStatus = 'Aguardando' | 'Aprovado' | 'Reprovado';

export function getAttendanceApprovalStatus(
  attendance: AttendanceSummary,
  absentForFail = 2,
): AttendanceApprovalStatus {
  const consolidated = attendance.present + attendance.absent + attendance.excused;

  if (consolidated === 0) return 'Aguardando';
  if (attendance.absent >= absentForFail) return 'Reprovado';
  return 'Aprovado';
}
