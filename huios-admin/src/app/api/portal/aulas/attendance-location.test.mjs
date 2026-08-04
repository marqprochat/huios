import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveAttendanceLocation } from './[id]/checkin/attendance-location.ts'

test('applies the institution location without discarding the portal lesson data', () => {
  assert.deepEqual(
    resolveAttendanceLocation(
      {
        id: 'lesson-1',
        locationName: null,
        latitude: null,
        longitude: null,
        radiusMeters: 75,
      },
      {
        locationName: 'Campus principal',
        latitude: -23.5,
        longitude: -46.6,
        radiusMeters: 180,
      },
    ),
    {
      id: 'lesson-1',
      locationName: 'Campus principal',
      latitude: -23.5,
      longitude: -46.6,
      radiusMeters: 180,
    },
  )
})

test('uses the institution location even when a legacy lesson has coordinates', () => {
  assert.deepEqual(
    resolveAttendanceLocation(
      {
        id: 'lesson-2',
        locationName: 'Local antigo',
        latitude: -22.1,
        longitude: -45.2,
        radiusMeters: 90,
      },
      {
        locationName: 'Campus principal',
        latitude: -23.5,
        longitude: -46.6,
        radiusMeters: 180,
      },
    ),
    {
      id: 'lesson-2',
      locationName: 'Campus principal',
      latitude: -23.5,
      longitude: -46.6,
      radiusMeters: 180,
    },
  )
})
