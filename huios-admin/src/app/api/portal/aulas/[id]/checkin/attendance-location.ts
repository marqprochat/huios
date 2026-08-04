interface AttendanceLocation {
  latitude: number | null
  longitude: number | null
  radiusMeters: number
  locationName?: string | null
}

export function resolveAttendanceLocation<T extends AttendanceLocation>(
  lesson: T,
  institution: AttendanceLocation | null,
): T | null {
  if (institution?.latitude != null && institution.longitude != null) {
    const locationName = institution.locationName ?? lesson.locationName

    return {
      ...lesson,
      latitude: institution.latitude,
      longitude: institution.longitude,
      radiusMeters: institution.radiusMeters,
      ...(locationName !== undefined ? { locationName } : {}),
    }
  }

  // Lesson coordinates are not authoritative; all check-ins use the institution location.
  return null
}
