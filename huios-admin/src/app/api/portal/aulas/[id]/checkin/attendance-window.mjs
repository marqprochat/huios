export function getAttendanceWindow(action, start, end, bufferMinutes) {
  const buffer = bufferMinutes * 60 * 1000

  if (action === 'checkout') {
    return {
      start: new Date(end.getTime() - buffer),
      end: new Date(end.getTime() + buffer),
    }
  }

  return {
    start: new Date(start.getTime() - buffer),
    end: new Date(start.getTime() + buffer),
  }
}
