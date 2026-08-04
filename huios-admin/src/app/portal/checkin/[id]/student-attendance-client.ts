export type StudentAttendanceAction = 'checkin' | 'checkout'

export interface StudentAttendanceCoordinates {
  latitude: number
  longitude: number
}

export async function submitStudentAttendance(
  lessonId: string,
  action: StudentAttendanceAction,
  coordinates: StudentAttendanceCoordinates,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(`/api/portal/aulas/${lessonId}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...coordinates, action }),
  })
  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.error || `Erro ao realizar ${action === 'checkin' ? 'check-in' : 'check-out'}`)
    ;(error as Error & { code?: string }).code = data.code
    throw error
  }

  return data
}
