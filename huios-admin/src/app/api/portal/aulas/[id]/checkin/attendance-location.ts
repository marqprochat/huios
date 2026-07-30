interface AttendanceLocation {
  latitude: number | null
  longitude: number | null
  radiusMeters: number
}

export function resolveAttendanceLocation(
  lesson: AttendanceLocation,
  institution: AttendanceLocation | null,
): AttendanceLocation | null {
  if (lesson.latitude != null && lesson.longitude != null) {
    return lesson
  }

  if (institution?.latitude != null && institution.longitude != null) {
    return institution
  }

  return null
}
